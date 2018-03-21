import "reflect-metadata";

import { GQLQuery, IGQLFieldOptions, IGQLResolverDefine } from "./index";
import { GQLType, IGQLResolverDataModel } from "./declare";
import { isFunction, isPrimitive } from "util";
import { GQLU } from "./utils";
import * as _ from 'lodash';
import { GQLSelect } from "./select";

export interface IGQLModelClass<M = any> {
    gql?: GQL;
    spec?: GQLModelSpec<M>;
    new(): M;

    resolve(query: GQLQuery): Promise<M[]>;

    DefaultSelect?: any;
}

export class GQLModel<T, M> {
    static gql: GQL;
    
    // async resolveRef<K, R, GR extends GQLModel<R>>(data: SELF[], query: GQLQuery, myKey: string, refKey?: ((v: GR) => K) | string): Promise<GR[]> {
    //     const getMyKey: (v: SELF) => K = (v) => v[myKey as string];
    //     const getRefKey = isFunction(refKey) ? refKey : (v) => v[refKey as string || 'id'];

    //     const resolver = this.resolve
    // }

    // async resolveRef<T>(data: T, query: GQLQuery, refName: string) {
    //     const refQuery = query.select.get(refName).subQuery || new GQLQuery(this.gql, {});
    //     refQuery.filter.id = new GQLFieldFilter('id', _.uniq(bookings.map(b => b.booker)));
    //     const bookers = await this.gql.get(GQLUser).resolve(refQuery);
    //     return bookers;
    // }

    static async gqlMapping<M>(data: any[], query: GQLQuery): Promise<M[]> {
        const gql = query.gql;
        const spec = gql.get<M>(this);
        
        const modelData: IGQLResolverDataModel<any, M>[] = data.map(d => ({data: d, model: new spec.model()}));
        for (const select of query.select.fields) {
            const keySpec = spec.keys.find(k => k.key == select.field);
            if (!keySpec) {
                continue;
            }

            // this field has resolver
            const resolverSpec = spec.resolvers.find(r => r.name == select.field);
            if (resolverSpec != null) {
                await resolverSpec.resolve(modelData, query);
                continue;
            }

            // this field is a reference
            // const refModel = gql.get<any>(keySpec.type as Function);
            // if (refModel != null) {
            //     continue;
            // }

            // or a generic reference
            // const genericModel = gql.get<any>(keySpec.options.generic as Function);
            // if (genericModel != null && keySpec.type == Array) {
            //     continue;
            // }

            modelData.forEach(md => {
                const raw = GQLU.gqlParse(gql, keySpec, md.data[keySpec.name]);
                if (raw !== undefined) {
                    md.model[keySpec.key] = raw;
                }
            })
        }

        return modelData.map(md => md.model);
    }
}

export class GQLModelKeySpec {
    name: string;
    key: string;
    type: GQLType;
    options: IGQLFieldOptions;
}

export class GQLModelSpec<M = any> {
    name: string;
    model: IGQLModelClass<M>;
    keys: GQLModelKeySpec[];
    resolvers: IGQLResolverDefine[];

    getKey(name: string) {
        return this.keys.find(k => k.name == name);
    }
}

export class GQL {
    private _models: GQLModelSpec<any>[] = [];

    get<M = any>(arg: string | Function): GQLModelSpec<M> {
        return this._models.find(sp => sp.name == arg || sp.model == arg);
    }

    add(m: IGQLModelClass) {
        const spec = new GQLModelSpec();
        spec.model = m;
        spec.model.gql = this;
        spec.model.spec = spec;
        spec.name = Reflect.getMetadata('gql:type', m);
        const keys: string[] = Reflect.getMetadata('gql:keys', m.prototype) || [];
        spec.keys = keys.map(k => {
            const keySpec = new GQLModelKeySpec();
            keySpec.name = Reflect.getMetadata('gql:name', m.prototype, k);
            keySpec.key = Reflect.getMetadata('gql:key', m.prototype, k);
            keySpec.type = Reflect.getMetadata('gql:type', m.prototype, k);
            keySpec.options = Reflect.getMetadata('gql:options', m.prototype, k);
            return keySpec;
        })
        spec.resolvers = Reflect.getMetadata('gql:resolvers', m) || [];
        this._models.push(spec);
    }

    queryFromHttpQuery(query: any, type?: IGQLModelClass<any>) {
        const data: any = {};
        
        const fields: string[] = query.$fields && query.$fields.split(',');
        fields && fields.forEach(f => _.set(data, f, true));
        
        const filterKeys = _.keys(query).filter(f => !f.startsWith('$'));
        data.$query = {};
        filterKeys.map(k => _.set(data.$query, k, query[k]));

        if (!type) {
            data.$type = query.$type;
        }

        const q = new GQLQuery(this, type, data);
        return q;
    }
}

export const GQLGlobal = new GQL();