import "reflect-metadata";

import { GQLQuery, IGQLFieldOptions, GQLMapper } from "./index";
import { GQLType } from "./declare";
import { isFunction, isPrimitive, isArray, isObject } from "util";
import { GQLU } from "./utils";
import * as _ from 'lodash';
import { GQLSelect } from "./select";
import { GQLFilter } from "./filter";
import { GQLMetaResolverSpec } from "./meta";

export interface IGQLResolver<T>{
    (query: GQLQuery): Promise<T[]>
}

export interface IGQLResolverOptions<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    priority?: number;
    // fields?: string[];
    matches?: (filter: GQLFilter<T, M>) => boolean;
}

export class GQLResolverSpec<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    resolve: IGQLResolver<T>;
    opts: IGQLResolverOptions<T, M>;

    constructor(resolver: IGQLResolver<T>, opts: IGQLResolverOptions<T, M>) {
        this.resolve = resolver;
        this.opts = opts;
    }

    isMatch(filter: GQLFilter<T, M>) {
        return !this.opts.matches || this.opts.matches(filter);
    }
}

export interface IGQLMapper<T, M extends GQLModel<T, M>> {
    (query: GQLQuery, models: M[]): Promise<M[]>
}

export interface IGQLMapperOptions<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    fields?: (keyof M)[];
    addRawFields?: (keyof T)[];
}

export class GQLMapperSpec<T, M extends GQLModel<T, M>> {
    map: IGQLMapper<T, M>;
    opts: IGQLMapperOptions<T, M>;

    constructor(map: IGQLMapper<T, M>, opts: IGQLMapperOptions<T, M>) {
        this.map = map;
        this.opts = opts;
    }

    isMatch(select: GQLSelect<T, M>) {
        return !this.opts.fields || _.intersection(this.opts.fields, select.fields.map(f => f.field)).length > 0;
    }
}

export interface IGQLModelClass<T, M extends GQLModel<T, M> = GQLModel<T, any>> {
    gql?: GQL;
    new(): M;

    resolve(query: GQLQuery<T, M>): Promise<M[]>;
    meta<META = any>(query: GQLQuery<T, M>): Promise<META>;

    DefaultSelect?: any;
}

export interface IGQLObjectSchema {
    schema?: object;
    extraSchema?: object;
    ref?: string;
}

export class GQLModel<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    static gql: GQL;

    @GQLU.nonenumerable
    raw?: T;

    static async _preResolve<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(query: GQLQuery<T, M>) {
        const gql = this.gql;
        const spec = gql.get(query.target);

        // add raw field of mapper
        const mappers = spec.mappers;
        for (const mapper of mappers) {
            if (!GQLU.isEmpty(mapper.opts.addRawFields) && mapper.isMatch(query.select)) {
                query.select.addRawField(...(mapper.opts.addRawFields));
            }
        }
    }

    static async _resolve<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(query: GQLQuery<T, M>): Promise<T[]> {
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

    static async _mapping<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(query: GQLQuery<T, M>, models: M[]): Promise<M[]> { 
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

    static async resolve<T = any, M extends GQLModel<T, M> = GQLModel<T, any>>(query: GQLQuery<T, M>): Promise<M[]> {
        await this._preResolve(query);
        const rawModels = await this._resolve<T, M>(query);
        const gql = this.gql;
        const spec = gql.get<T, M>(query.target as IGQLModelClass<T, M>);
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
                const raw = md.raw && (_.isString(keySpec.dataName)) && GQLU.gqlParse(gql, keySpec, md.raw[keySpec.dataName as string]);
                if (raw !== undefined) {
                    md[keySpec.key] = raw;
                }
            });
        }

        return models;
    }

    static async meta<META = any>(query: GQLQuery): Promise<META> {
        const gql = this.gql;
        const spec = gql.get(query.target);

        const meta = {};
        for (const field of query.meta.fields) {
            const resolvers = spec.getMetaResolvers(field);
            if (resolvers.length == 0) throw new Error(`Cannot resolve meta! Field ${field} not found`);
            const resolver = resolvers.find(r => r.isMatch(query.filter));
            if (resolver) {
                const data = await resolver.resolve.apply(query.target, [query]);
                meta[field] = data;
            }
        }
        
        return meta as META;
    }

    static openAPISchema(_gql?: GQL) {
        const gql = _gql ?? this.gql
        if (!gql) throw new Error('GQL object not found, please add this model into a GQL object (eg: GQLGlobal)')

        const spec = gql.get(this as IGQLModelClass<any>);
        if (spec.schemas?.schema) return spec.schemas?.schema
        
        const reqFields = spec.keys.filter(k => k.options.schemaRequiredFields).map(k => k.key)
        return {
            'type': 'object',
            'properties': GQLU.arrToObj(spec.keys, k => k.key, k => GQLU.gqlOpenAPISchema(gql, k)),
            ...reqFields.length > 0 && { 'requiredProperties': reqFields },
            ...spec.schemas?.extraSchema
        }
    }
}

export class GQLModelKeySpec {
    private __rawType: GQLType = null;

    dataName: string | Symbol;
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
    resolvers: GQLResolverSpec<T, M>[];
    metaResolvers: GQLMetaResolverSpec[];
    mappers: GQLMapperSpec<T, M>[];
    schemas?: IGQLObjectSchema

    getKey(name: string | (keyof M)) {
        return this.keys.find(k => k.key == name);
    }

    getMetaResolvers(name: string) {
        return this.metaResolvers.filter(mr => mr.opts.field == name);
    }

    addResolver(resolver: GQLResolverSpec<T, M>) {
        resolver.opts.priority = resolver.opts.priority || 0;
        this.resolvers.splice(_.sortedIndex(this.resolvers.map(r => r.opts.priority), resolver.opts.priority), 0, resolver);
    }
}

export class GQL {
    private _models: GQLModelSpec<any>[] = [];

    get<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(arg: string | IGQLModelClass<T, M>): GQLModelSpec<T, M> {
        return <any> this._models.find(sp => sp.name == arg || (sp.model as any) === arg);
    }

    add<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(m: IGQLModelClass<T, M>) {
        const spec = new GQLModelSpec<T, M>();
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

        spec.metaResolvers = Reflect.getMetadata('gql:metas', m) || [];
        spec.metaResolvers = _.sortBy(spec.metaResolvers, r => r.opts.priority)

        spec.schemas = Reflect.getMetadata('gql:schemas', m)

        this._models.push(spec as GQLModelSpec<any, any>);
    }

    queryFromHttpQuery<T, M extends GQLModel<T, any>>(query: any, type?: new () => M) {
        const data: any = {};
        
        const fields: string[] = query.$fields && query.$fields.split(',');
        fields && fields.forEach(f => _.set(data, f, true));
        
        const filterKeys = _.keys(query).filter(f => !f.startsWith('$'));
        data.$query = {};
        filterKeys.map(k => data.$query[k] = query[k].split(','));

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
        data.$offset = GQLU.parseIntNull(query.$offset);
        data.$page = GQLU.parseIntNull(query.$page);
        data.$pageSize = GQLU.parseIntNull(query.$pageSize);

        data.$meta = (query.$meta && query.$meta.split(',')) || [];

        data.$options = {
            one: GQLU.toBoolean(query.$one)
        }

        if (!type) {
            data.$type = query.$type;
        }

        const q = new GQLQuery<T, M>(this, type, data);
        return q;
    }
}

export const GQLGlobal = new GQL();