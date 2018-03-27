import "reflect-metadata";
import { GQLBaseType, GQLType } from "./declare";
import { GQLU } from "./utils";
import { IGQLModelClass, GQLResolverSpec, IGQLResolverOptions, IGQLMapperOptions, IGQLMapper, GQLMapperSpec } from "./model";
import { GQLQuery } from "./index";
import { GQLFieldFilter } from "./filter";
import * as _ from 'lodash';

export type IGQLFieldGeneric = GQLType | {[field: string]: IGQLFieldGeneric};

export interface IGQLFieldOptions {
    type?: GQLType;
    dataName?: string;
    tags?: string[];
    generic?: IGQLFieldGeneric;
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

export function GQLField(options?: IGQLFieldOptions) {
    options = options || {};
    return (target: any, key: string) => {
        const type = options.type || GQLU.gqlTypeFromDesignType(Reflect.getMetadata('design:type', target, key));
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

function defineMapper(target: any, opts: IGQLMapperOptions, mappingFunc: any) {
    const mappers: GQLMapperSpec<any, any>[] = Reflect.getMetadata(`gql:mappers`, target) || [];
    mappers.push(new GQLMapperSpec(mappingFunc, opts || {fields: []}));
    Reflect.defineMetadata(`gql:mappers`, mappers, target);
}

export function GQLMapper(opts?: IGQLMapperOptions) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        defineMapper(target, opts, desc.value);
    }
}