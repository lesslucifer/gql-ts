import "reflect-metadata";
import { GQLType } from "./declare";
import { GQLU } from "./utils";
import { IGQLModelClass, GQLResolverSpec, IGQLResolverOptions, IGQLMapperOptions, GQLMapperSpec, IGQLObjectSchema } from "./model";
import { GQLQuery, IGQLMetaResolverOptions, defineMetaResolver } from "./index";
import { GQLFieldFilter } from "./filter";
import * as _ from 'lodash';
import { GQLPagination } from "./pagination";

export type IGQLFieldGeneric = GQLType | {[field: string]: IGQLFieldGeneric};

export interface IGQLFieldOptions {
    type?: () => GQLType;
    dataName?: string | Symbol;
    tags?: string[];
    generic?: IGQLFieldGeneric;
    autoSelect?: boolean;
    metadata?: any;
    
    schemaRequiredFields?: boolean;
    schema?: object;
    extraSchema?: object;
}

export interface IGQLObjectDefine {
    name: string;
    type: Object;
}

export function GQLObject(name: string) {
    return (target: any) => {
        Reflect.defineMetadata('gql:type', name, target);
        const types: IGQLObjectDefine[] = Reflect.getMetadata('gql', GQLObject) || [];
        types.push({type: target, name: name});
        Reflect.defineMetadata('gql', types, GQLObject);
    }
}

export function GQLObjectSchema(opts: IGQLObjectSchema) {
    return (target: any) => {
        Reflect.defineMetadata(`gql:schemas`, opts, target);
    }
}

export function GQLField(options?: IGQLFieldOptions) {
    options = options || {};
    return (target: any, key: string) => {
        const type = options.type || (() => GQLU.gqlTypeFromDesignType(Reflect.getMetadata('design:type', target, key)));
        GQLU.assert(type != null, `${target}: Cannot get type for key ${key}! Try use Functional type`);

        const name = options.dataName || key;
        Reflect.defineMetadata(`gql:dataName`, name, target, key);
        Reflect.defineMetadata(`gql:key`, key, target, key);
        Reflect.defineMetadata(`gql:type`, type, target, key);
        Reflect.defineMetadata(`gql:options`, options, target, key);
        const keys: string[] = Reflect.getMetadata('gql:keys', target) || [];
        keys.push(key);
        Reflect.defineMetadata('gql:keys', keys, target);
    }
}

export function GQLFieldOptions(options: IGQLFieldOptions) {
    return (target: any, key: string) => {
        const type = options.type || (() => GQLU.gqlTypeFromDesignType(Reflect.getMetadata('design:type', target, key)));
        GQLU.assert(type != null, `${target}: Cannot get type for key ${key}! Try use Functional type`);

        const oldOptions = Reflect.getMetadata(`gql:options`, target, key)
        Reflect.defineMetadata(`gql:options`, {...oldOptions, ...options}, target, key);
    }
}

function defineResolver(target: any, opts: IGQLResolverOptions, resolveFunc: any) {
    const resolvers: GQLResolverSpec<any>[] = Reflect.getMetadata(`gql:resolvers`, target) || [];
    opts.priority = opts.priority || 0;
    resolvers.push(new GQLResolverSpec(resolveFunc, opts));
    Reflect.defineMetadata(`gql:resolvers`, resolvers, target);
}

export function GQLResolver(opts: IGQLResolverOptions) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        defineResolver(target, opts, desc.value);
    }
}

export function GQLRootResolver() {
    return GQLResolver({priority: 0});
}

function defineMapper(target: any, opts: IGQLMapperOptions<any>, mappingFunc: any) {
    const mappers: GQLMapperSpec<any>[] = Reflect.getMetadata(`gql:mappers`, target) || [];
    mappers.push(new GQLMapperSpec(mappingFunc, opts || {fields: []}));
    Reflect.defineMetadata(`gql:mappers`, mappers, target);
}

export function GQLMapper(opts?: IGQLMapperOptions<any>) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        defineMapper(target, opts, desc.value);
    }
}

export function GQLIdenticalMapping(dataName?: string) {
    return (target: any, key: string) => {
        const rawKey = dataName || key;
        defineMapper(target.constructor, {fields: [key]}, async (query: GQLQuery<any>, models: any[]) => {
            models.forEach(m => {
                m[key] = m.raw[rawKey];
            });

            return models;
        });
    }
}

export interface IGQLFieldRevMappingOpts<M1, M2> {
    targetType?: IGQLModelClass<any, any>
    queryField: string;
    extractor?: (model: M1) => any;
    extractField?: string;
    rawField?: string;
    mappingFunc?: (model: M1, targets: M2[]) => any;
    mappingFilter?: (model: M1, target: M2) => boolean;
}

export function GQLFieldRevMapping(opts: IGQLFieldRevMappingOpts<any, any>) {
    return (target: any, key: string) => {
        defineMapper(target.constructor, {fields: [key]}, async (query: GQLQuery<any>, models: any[]) => {
            const spec = query.gql.get(target.constructor);
            const field = key;
            const fieldSpec = spec.getKey(field);
            const dataName = fieldSpec.dataName;
            const targetType: IGQLModelClass<any, any> = opts.targetType || <any> fieldSpec.trueType;
            const queryField = opts.queryField;
            const extractField   = opts.extractField || `raw.${dataName}`;
            const extractor = opts.extractor || (m => _.get(m, extractField));
            const rawField = opts.rawField || queryField;
            const mappingFilter = opts.mappingFilter || ((m, t) => extractor(m) == _.get(t.raw, rawField))
            const mappingFunc = opts.mappingFunc || (
                (fieldSpec.rawType == Array) ? 
                ((m, tgs: any[]) => m[field] = tgs.filter(t => mappingFilter(m, t))) : 
                ((m, tgs: any[]) => m[field] = tgs.find(t => mappingFilter(m, t))));

            const select = query.select.get(field as any);
            const subQuery = select.subQuery || query.emptyQuery(targetType);
            subQuery.filter.add(new GQLFieldFilter(queryField as any, _.flatMap(models, (m => extractor(m)))));
            subQuery.select.addRawField(rawField);
            subQuery.pagination.limit = GQLPagination.UNLIMITED;
    
            const targetModels = await subQuery.resolveArray();
            
            models.forEach(m => mappingFunc(m, targetModels));
            return models;
        });
    }
}

export function GQLMetaResolver(opts: IGQLMetaResolverOptions) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        defineMetaResolver(target, opts, desc.value);
    }
}

export function GQLFieldSchema(schema: any, extraSchema?: any) {
    return GQLFieldOptions({
        schema,
        extraSchema
    })
}

export function GQLFieldExtraSchema(extraSchema: any) {
    return GQLFieldOptions({
        extraSchema
    })
}

export function GQLFieldArraySchema(schema: any, extraFields?: object) {
    return GQLFieldSchema({
        'type': 'array',
        'items': schema,
        ...extraFields
    })
}