import "reflect-metadata";
import { GQLBaseType, GQLType, IGQLResolverDataModel } from "./declare";
import { GQLU } from "./utils";
import { IGQLModelClass } from "./model";
import { GQLQuery } from "./index";
import { GQLFieldFilter } from "./filter";
import * as _ from 'lodash';

export interface IGQLFieldOptions {
    type?: GQLType;
    name?: string;
    tags?: string[];
    generic?: GQLType;
}

export interface IGQLObjectDefine {
    name: string;
    type: Object;
}

export interface IGQLResolverDefine {
    name: string;
    resolve: Function;
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
        const name = options.name || key;
        Reflect.defineMetadata(`gql:name`, name, target, key);
        Reflect.defineMetadata(`gql:key`, key, target, key);
        Reflect.defineMetadata(`gql:type`, type, target, key);
        Reflect.defineMetadata(`gql:options`, options, target, key);
        const keys: string[] = Reflect.getMetadata('gql:keys', target) || [];
        keys.push(key);
        Reflect.defineMetadata('gql:keys', keys, target);
    }
}

export function GQLRootResolver() {
    return GQLResolver('__root');
}

function defineResolver(target: any, name: string, resolveFunc: any) {
    const resolvers: IGQLResolverDefine[] = Reflect.getMetadata(`gql:resolvers`, target) || [];
    resolvers.push({
        name: name,
        resolve: resolveFunc
    });
    Reflect.defineMetadata(`gql:resolvers`, resolvers, target);
}

export function GQLResolver(field: string) {
    return (target: any, key: string, desc: PropertyDescriptor) => {
        defineResolver(target, field, desc.value);
    }
}

export interface IGQLMappingResolverOptions {
    refKey?: string;
    targetKey?: string;
    refCollectors?: (dataModel: IGQLResolverDataModel<any, any>[]) => any;
    targetClass?: IGQLModelClass;
}

// function resolveTypeForKey(model: IGQLModelClass, key: string): IGQLModelClass {
//     const keySpec = model.spec.getKey(key);
//     if (!keySpec) return null;

//     return <any> (keySpec.type || keySpec.options.generic);
// }

export function GQLMappingResolver(opts?: IGQLMappingResolverOptions) {
    opts = opts || {};
    return (target: any, key: string) => {
        const model: IGQLModelClass = target.constructor;
        const refKey = opts.refKey || key;
        const targetKey = opts.targetKey || 'id';
        
        const resolver = async (dataModel: IGQLResolverDataModel<any, any>[], query: GQLQuery) => {
            const refCollector = opts.refCollectors || ((dataModel) => _.uniq(dataModel.map(dm => dm.data[refKey])));

            const targetQuery = query.select.get(refKey).subQuery;
            if (!targetQuery) return;
            targetQuery.filter.add(new GQLFieldFilter(targetKey, refCollector(dataModel)));
            const targets = await targetQuery.resolve();
            const targetDict = _.groupBy(targets, targetKey);
            const map = model.spec.getKey(refKey).type == Array ? _.identity : _.first;
            dataModel.forEach(dm => dm.model[key] = map(targetDict[dm.data[refKey]]) || null);
        }

        defineResolver(model, key, resolver);
    }
}