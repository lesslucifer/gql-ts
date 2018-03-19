import { GQLBaseType, GQLType } from "./declare";
import { IGQLObjectDefine, GQLObject } from "./index";
import { isArray, isObject, isString, isNumber, isBoolean, isNullOrUndefined, isFunction } from "util";
import { GQLModelKeySpec, GQLModel, GQL } from "./model";

export class GQLUtils {
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

    notEmpty(data: any, isEmpty: (any)  => boolean = this.isEmpty, deep = true) {
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
            return s == '' || s == 'false' || s == 'no' || s == '0';
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

    gqlParse(gql: GQL, spec: GQLModelKeySpec, value: any) {
        if (!spec) {
            return undefined;
        }
        
        if (value === null || value === undefined) {
            return value;
        }

        if (spec.type === GQLBaseType.BOOL) {
            return this.toBoolean(value);
        }

        if (spec.type === GQLBaseType.DOUBLE) {
            const x = parseFloat(value);
            return isNaN(x) ? null : x;
        }

        if (spec.type === GQLBaseType.INT) {
            const n = parseInt(value);
            return isNaN(n) ? null : n;
        }

        if (spec.type === GQLBaseType.STRING) {
            return this.toString(value);
        }

        if (spec.type == Object) {
            // TODO: handle for case nested object
        }

        if (spec.type == Array) {
            // TODO: handle for case array
        }

        // for other cases
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
}

export const GQLU = new GQLUtils;
export default GQLU;