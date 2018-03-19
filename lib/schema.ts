import { isObject, isFunction } from "util";
import { GQLQuery } from "./index";
import { GQLBaseType } from "./declare";

export interface IGQLRootResolver {
    (query: GQLQuery): any;
}

export interface IGQLFieldresolver {

}

export interface IGQLFieldSchemaSpec {
    type: string | GQLBaseType;
    mapName?: string;
    resolve: IGQLFieldresolver;
}

export interface IGQLSchemaSpec {
    name: string;
    resolve: IGQLRootResolver;
    fields: {[field: string]: IGQLFieldSchemaSpec}
}

export class GQL {
    
}

export class GQLFieldSchema {
    constructor(sch: any) {

    }
}

export class GQLInvalidSchemaFormatError extends Error {
    
}

export class GQLModelSchema {
    gql?: GQL;
    name: string;
    fields: GQLFieldSchema[];
    resolve: GQLResolver;

    constructor(sch: any) {
        if (!isObject(sch)) {
            throw new GQLInvalidSchemaFormatError(`Schema is not an object`);
        }

        if (!isObject(sch.fields)) {
            throw new GQLInvalidSchemaFormatError(`Schema fields is not an object`);
        }

        if (!isFunction(sch.resolve)) {
            throw new GQLInvalidSchemaFormatError(`Schema root resolver is not a function`);            
        }

        const fields: any[] = sch.fields;
        this.fields = fields.map(f => new GQLFieldSchema(f));
        this.resolve = sch.resolve;
    }
}