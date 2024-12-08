import { GQLModel } from "./model";

export enum GQLBaseType {
    STRING,
    INT,
    DOUBLE,
    BOOL
}

export const GQL_NONE = Symbol('gql:none');

export type GQLType = GQLBaseType | Function;

export type DotNotationKeys<T, Prefix extends string = "", Depth extends number = 5> =
    Depth extends 0
    ? never
    : {
        [K in keyof T]: T[K] extends object
        ? T[K] extends Array<any> // Skip arrays if needed
        ? `${Prefix}${K & string}`
        : `${Prefix}${K & string}` | DotNotationKeys<T[K], `${Prefix}${K & string}.`, DecrementDepth<Depth>>
        : `${Prefix}${K & string}`;
    }[keyof T];

type DecrementDepth<N extends number> =
    N extends 5 ? 4 :
    N extends 4 ? 3 :
    N extends 3 ? 2 :
    N extends 2 ? 1 :
    N extends 1 ? 0 : never;

export type GQLModelDataType<M extends GQLModel<any, any>> = M extends GQLModel<infer T, infer D> ? T : any;