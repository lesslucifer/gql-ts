import { GQLBaseType, GQLType } from "./declare";
import { GQLQuery } from "./index";
import { isArray, isObject, isString, isNumber, isBoolean, isNullOrUndefined } from "util";
import { GQLModelKeySpec, GQL } from "./model";
import { GQLFilter } from "./filter";
import { AssertionError } from "assert";
import _ = require('lodash')

export class GQLUnauthorizedQuery extends Error {

}

export class GQLUtils {
    Parsers = [this._gqlParse.bind(this)]
    OpenAPISchemaParsers = [this._gqlOpenAPISchema.bind(this)]

    assert(mustBeTrue, msg = "Error") {
        if (!mustBeTrue) {
            throw new AssertionError({message: msg});
        }
    }

    gqlTypeFromDesignType(type: any): GQLType {
        if (type === String) {
            return GQLBaseType.STRING;
        }
        else if (type === Number) {
            return GQLBaseType.DOUBLE;
        }
        else if (type === Boolean) {
            return GQLBaseType.BOOL;
        }
        
        if (typeof type === "function") {
            return <Function> type;
        }

        return null;
    }

    // getTarget(type: string): Function {
    //     const types: IGQLObjectDefine[] = Reflect.getMetadata('gql', GQLObject);
    //     return types && (types.find(t => t.name == type) || {type: null}).type;
    // }

    arrToObj<T, V>(arr: T[], keyMap: (t: T, idx: number) => string, valMap: (t: T, idx: number) => V): {[k: string]: V} {
        if (!arr) return {};
        const ret = {};
        for (let i = 0; i < arr.length; ++i) {
            ret[keyMap(arr[i], i)] = valMap(arr[i], i);
        }
        
        return ret;
    }

    filterObj<V>(obj: Object, predicate: (k?: string, v?: V) => boolean) {
        return Object.keys(obj).filter(k => predicate(k, obj[k])).reduce((o, k) => {
            o[k] = obj[k];
            return o;
        }, {});
    }

    mapObj<V1, V2>(obj: Object, iterator: (k?: string, v?: V1) => V2) {
        return Object.keys(obj).reduce((o, k) => {
            o[k] = iterator(k, obj[k]);
            return o;
        }, <any>{});
    }

    isEmpty(obj?: any): boolean
    {
        return  ((obj == null || obj === NaN || obj === false) ||
                (isString(obj) && obj.length == 0) ||
                ((obj instanceof Array) && obj.length == 0) ||
                ((obj instanceof Object) && Object.keys(obj).length == 0));
    }

    notEmpty(data: any, isEmpty: (any)  => boolean = this.isEmpty, deep = false) {
        if (isArray(data)) {
            const filteredData = data.filter(d => !isEmpty(d));
            if (deep) {
                return filteredData.map(d => this.notEmpty(d, isEmpty, true));
            }

            return filteredData;
        }
        else if (isObject(data)) {
            const filteredObj = this.filterObj(data, (k, v) => !isEmpty(v));
            if (deep) {
                return this.mapObj(filteredObj, (k, v) => this.notEmpty(v, isEmpty, true));
            }

            return filteredObj;
        }

        return data;
    }

    toBoolean(value: any): boolean {
        if (isNullOrUndefined(value)) {
            return false;
        }

        if (isBoolean(value)) {
            return value;
        }

        if (isNumber(value)) {
            return value !== 0;
        }

        if (isString(value)) {
            const s = (value as string).trim().toLowerCase();
            return !(s == '' || s == 'false' || s == 'no' || s == '0');
        }

        if (isArray(value)) {
            return value.length == 0;
        }

        if (isObject(value)) {
            return Object.keys(value).length == 0;
        }

        return null;
    }

    toString(value: any): string {
        if (isNullOrUndefined(value)) {
            return null;
        }

        if (isString(value)) {
            return value;
        }

        if (isNumber(value) || isBoolean(value)) {
            return value.toString();
        }

        return null;
    }

    private _gqlParse(gql: GQL, spec: GQLModelKeySpec, value: any) {
        if (!spec) {
            return undefined;
        }
        
        if (value === null || value === undefined) {
            return value;
        }

        if (spec.rawType === GQLBaseType.BOOL) {
            return this.toBoolean(value);
        }

        if (spec.rawType === GQLBaseType.DOUBLE) {
            const x = parseFloat(value);
            return isNaN(x) ? null : x;
        }

        if (spec.rawType === GQLBaseType.INT) {
            const n = parseInt(value);
            return isNaN(n) ? null : n;
        }

        if (spec.rawType === GQLBaseType.STRING) {
            return this.toString(value);
        }

        if (spec.rawType == Object) {
            // TODO: handle for case nested object
        }

        if (spec.rawType == Array) {
            // TODO: handle for case array
        }

        // for other cases
        return undefined;
    }

    gqlParse(gql: GQL, spec: GQLModelKeySpec, value: any) {
        for (const p of this.Parsers) {
            const val = p(gql, spec, value);
            if (val !== undefined) {
                return val;
            }
        }

        return undefined;
    }

    select<T>(...args: T[]): T {
        for (const arg of args) {
            if (!this.isEmpty(arg)) {
                return arg;
            }
        }

        return undefined;
    }

    recursiveSelectFields(query: GQLQuery) {
        if (!query) return [];
        const fields = query.select.fields.filter(f => !f.subQuery).map(f => f.field);

        query.select.fields.filter(f => f.subQuery != null)
        .forEach(f => {
            const subFields = this.recursiveSelectFields(f.subQuery);
            if (this.isEmpty(subFields)) return;

            fields.push(...subFields.map(sf => `${f.field}.${sf}`));
        });

        return fields;
    }

    whiteListSelect(query: GQLQuery, ...whiteList: string[]) {
        const selFields = this.recursiveSelectFields(query);
        const invalidField = selFields.find(f => whiteList.find(wq => wq == f) == null)
        if (invalidField != null) {
            throw new GQLUnauthorizedQuery(`Unavailable query. Cannot select field (${invalidField})!`)
        }
    }

    blackListSelect(query: GQLQuery, ...blackList: string[]) {
        const selFields = this.recursiveSelectFields(query);
        const invalidField = selFields.find(f => blackList.find(wq => wq == f) != null)
        if (invalidField != null) {
            throw new GQLUnauthorizedQuery(`Unavailable query. Cannot select field (${invalidField})!`)
        }
    }

    whiteListFilter(query: GQLQuery, ...whiteList: string[]) {
        const invalidField = query.filter.filters.find(f => whiteList.find(wq => wq == f.field) == null)
        if (invalidField != null) {
            throw new GQLUnauthorizedQuery(`Unavailable query. Cannot filter field (${invalidField.field})!`)
        }
    }
    
    blackListFilter(query: GQLQuery, ...blackList: string[]) {
        const invalidField = query.filter.filters.find(f => blackList.find(wq => wq == f.field) != null)
        if (invalidField != null) {
            throw new GQLUnauthorizedQuery(`Unavailable query. Cannot select field (${invalidField.field})!`)
        }
    }

    requireFilter(query: GQLQuery, ...requireds: string[]) {
        const notFoundFilter = requireds.find(r => query.filter.get(r).isEmpty);
        if (notFoundFilter) throw new GQLUnauthorizedQuery(`Unavailable query. Must have filter (${notFoundFilter})!`)
    }

    nonenumerable(target: Object, key: string) {
        Object.defineProperty(target, key, {
            get: function () { return undefined; },
            set: function (this: any, val: any) {
                Object.defineProperty(this, key, {
                    value: val,
                    writable: true,
                    enumerable: false,
                    configurable: true,
                });
            },
            enumerable: false,
        });
    }

    parseIntNull(v?: any) {
        const n = parseInt(v);
        if (isNaN(n)) {
            return null;
        }

        return n;
    }

    byFields(requiredFields: string[], optionalFields?: string[]) {
        const allowedFields = new Map();
        requiredFields.forEach(rf => allowedFields[rf] = true);
        optionalFields && optionalFields.forEach(optf => allowedFields[optf] = true);
        return (filter: GQLFilter) => {
            if (requiredFields.find(rf => filter.filters.find(ft => ft.field == rf) == null)) {
                console.log(requiredFields.find(rf => filter.filters.find(ft => ft.field == rf) == null));
                return false;
            }

            if (filter.filters.find(ft => allowedFields[ft.field] != true)) {
                return false;
            }

            return true;
        }
    }

    private _gqlOpenAPISchema(gql: GQL, spec: GQLModelKeySpec) {
        if (!spec) return undefined;

        if (spec.rawType === GQLBaseType.BOOL) {
            return {'type': 'boolean'}
        }

        if (spec.rawType === GQLBaseType.DOUBLE) {
            return {'type': 'number'}
        }

        if (spec.rawType === GQLBaseType.INT) {
            return {'type': 'integer'}
        }

        if (spec.rawType === GQLBaseType.STRING) {
            return {'type': 'string'}
        }

        if (_.isFunction(spec.rawType)) {
            const model = gql.get(spec.rawType)
            if (model) return {
                '$ref': model.schemas?.ref ?? `#/components/schemas/${model.name}`
            }
            return undefined
        }

        // for other cases
        return undefined;
    }

    gqlOpenAPISchema(gql: GQL, spec: GQLModelKeySpec) {
        if (spec.options.schema) return spec.options.schema
        for (const p of this.OpenAPISchemaParsers) {
            const val = p(gql, spec);
            if (val !== undefined) {
                return {
                    ...spec.options.extraSchema,
                    ...val
                };
            }
        }

        return {...spec.options.extraSchema};
    }
}

export const GQLU = new GQLUtils;
export default GQLU;