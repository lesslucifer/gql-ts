import "reflect-metadata";

import { GQLQuery, IGQLFieldOptions, GQLMapper } from "./index";
import { GQLType } from "./declare";
import { isFunction, isPrimitive, isArray, isObject } from "util";
import { GQLU } from "./utils";
import * as _ from 'lodash';
import { GQLSelect } from "./select";
import { GQLFilter } from "./filter";

export interface IGQLResolver<T>{
    (query: GQLQuery): Promise<T[]>
}

export interface IGQLResolverOptions {
    priority?: number;
    fields?: string[];
}

export class GQLResolverSpec<T> {
    resolve: IGQLResolver<T>;
    opts: IGQLResolverOptions;

    constructor(resolver: IGQLResolver<T>, opts: IGQLResolverOptions) {
        this.resolve = resolver;
        this.opts = opts;
    }

    isMatch(filter: GQLFilter) {
        return !this.opts.fields || _.intersection(filter.filters.map(f => f.field), this.opts.fields).length > 0;
    }
}

export interface IGQLMapper<T, M extends GQLModel<T, M>> {
    (query: GQLQuery, models: M[]): Promise<M[]>
}

export interface IGQLMapperOptions {
    fields?: string[];
}

export class GQLMapperSpec<T, M extends GQLModel<T, M>> {
    map: IGQLMapper<T, M>;
    opts: IGQLMapperOptions;

    constructor(map: IGQLMapper<T, M>, opts: IGQLMapperOptions) {
        this.map = map;
        this.opts = opts;
    }

    isMatch(select: GQLSelect) {
        return !this.opts.fields || _.intersection(this.opts.fields, select.fields.map(f => f.field)).length > 0;
    }
}

export interface IGQLModelClass<T, M extends GQLModel<T, M>> {
    gql?: GQL;
    new(): M;

    resolve(query: GQLQuery): Promise<M[]>;

    DefaultSelect?: any;
}

export class GQLModel<T, M> {
    static gql: GQL;

    @GQLU.nonenumerable
    raw?: T;

    static async _resolve<T>(query: GQLQuery): Promise<T[]> {
        const gql = this.gql;
        const spec = gql.get(query.target);
        const resolvers = spec.resolvers;

        for (let i = resolvers.length - 1; i >= 0; --i) {
            const r = resolvers[i];
            if (r.isMatch(query.filter)) {
                const data = await r.resolve.apply(query.target, [query]);
                if (data !== undefined) {
                    return data;
                }
            }
        }

        return [];   
    }

    static async _mapping(query: GQLQuery, models: any[]): Promise<any[]> { 
        const gql = this.gql;
        const spec = gql.get(query.target);
        const mappers = spec.mappers;
        for (const mapper of mappers) {
            if (mapper.isMatch(query.select)) {
                models = await mapper.map.call(query.target, query, models);
            }
        }
        
        return models;
    }

    static async resolve<T = any, M extends GQLModel<T, M> = GQLModel<T, any>>(query: GQLQuery): Promise<M[]> {
        const rawModels = await this._resolve<T>(query);
        const gql = this.gql;
        const spec = gql.get<T, M>(query.target);
        let models = rawModels.map(rm => {
            const model = new spec.model();
            model.raw = rm;
            return model;
        });

        if (models) {
            models = await this._mapping(query, models);
        }
        
        return models;
    }

    static async defaultMapping<T, M extends GQLModel<T, M>>(query: GQLQuery, models: M[]): Promise<M[]> {
        const gql = query.gql;
        const spec = gql.get(query.target)
        
        for (const select of query.select.fields) {
            const keySpec = spec.keys.find(k => k.key == select.field);
            if (!keySpec) {
                continue;
            }

            models.forEach(md => {
                const raw = GQLU.gqlParse(gql, keySpec, md.raw[keySpec.dataName]);
                if (raw !== undefined) {
                    md[keySpec.key] = raw;
                }
            });
        }

        return models;
    }
}

export class GQLModelKeySpec {
    private __rawType: GQLType = null;

    dataName: string;
    key: string;
    _rawType: () => GQLType;
    options: IGQLFieldOptions;

    get rawType() {
        if (!this.__rawType) {
            this.__rawType = this._rawType()
        }

        return this.__rawType;
    }

    get trueType(): GQLType {
        const raw = this.rawType;
        if (raw == Array || raw == Object) {
            return this.options.generic as GQLType;
        }
        
        return raw;
    }
}

export class GQLModelSpec<T = any, M extends GQLModel<T, M> = GQLModel<T, any>> {
    name: string;
    model: IGQLModelClass<T, M>;
    keys: GQLModelKeySpec[];
    resolvers: GQLResolverSpec<T>[];
    mappers: GQLMapperSpec<T, M>[];

    getKey(name: string) {
        return this.keys.find(k => k.key == name);
    }

    addResolver(resolver: GQLResolverSpec<T>) {
        resolver.opts.priority = resolver.opts.priority || 0;
        this.resolvers.splice(_.sortedIndex(this.resolvers.map(r => r.opts.priority), resolver.opts.priority), 0, resolver);
    }
}

export class GQL {
    private _models: GQLModelSpec<any>[] = [];

    get<T = any, M = GQLModel<T, any>>(arg: string | Function): GQLModelSpec<T, M> {
        return <any> this._models.find(sp => sp.name == arg || sp.model == arg);
    }

    add<T = any, M = GQLModel<T, any>>(m: IGQLModelClass<T, M>) {
        const spec = new GQLModelSpec();
        spec.model = m;
        spec.model.gql = this;
        spec.name = Reflect.getMetadata('gql:type', m);
        const keys: string[] = Reflect.getMetadata('gql:keys', m.prototype) || [];
        spec.keys = keys.map(k => {
            const keySpec = new GQLModelKeySpec();
            keySpec.dataName = Reflect.getMetadata('gql:dataName', m.prototype, k);
            keySpec.key = Reflect.getMetadata('gql:key', m.prototype, k);
            keySpec._rawType = Reflect.getMetadata('gql:type', m.prototype, k);
            keySpec.options = Reflect.getMetadata('gql:options', m.prototype, k);
            return keySpec;
        })
        spec.resolvers = Reflect.getMetadata('gql:resolvers', m) || [];
        spec.resolvers = _.sortBy(spec.resolvers, r => r.opts.priority)
        spec.mappers = [new GQLMapperSpec(GQLModel.defaultMapping, {}), ...Reflect.getMetadata('gql:mappers', m) || []];
        this._models.push(spec);
    }

    queryFromHttpQuery<T = any, M = GQLModel<T, any>>(query: any, type?: IGQLModelClass<T, M>) {
        const data: any = {};
        
        const fields: string[] = query.$fields && query.$fields.split(',');
        fields && fields.forEach(f => _.set(data, f, true));
        
        const filterKeys = _.keys(query).filter(f => !f.startsWith('$'));
        data.$query = {};
        filterKeys.map(k => _.set(data.$query, k, query[k].split(',')));

        const sortData: string[] = (query.$sort && query.$sort.split(',')) || [];
        data.$sort = sortData.map(sd => {
            const fieldData = sd.split(':');
            if (fieldData.length == 2) {
                return {field: fieldData[0], order: fieldData[1]}
            }

            return undefined;
        }).filter(sd => sd != null);
        
        const fromData: string[] = (query.$from && query.$from.split(',')) || [];
        data.$from = {};
        fromData.forEach(fd => {
            const fieldData = fd.split(':');
            if (fieldData.length == 2) {
                data.$from[fieldData[0]] = fieldData[1];
            };
        });

        const toData: string[] = (query.$to && query.$to.split(',')) || [];
        data.$to = {};
        toData.forEach(fd => {
            const fieldData = fd.split(':');
            if (fieldData.length == 2) {
                data.$to[fieldData[0]] = fieldData[1];
            };
        })

        data.$limit = GQLU.parseIntNull(query.$limit);

        if (!type) {
            data.$type = query.$type;
        }

        const q = new GQLQuery(this, type, data);
        return q;
    }
}

export const GQLGlobal = new GQL();