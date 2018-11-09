export enum GQLBaseType {
    STRING,
    INT,
    DOUBLE,
    BOOL
}

export const GQL_NONE = Symbol('gql:none');

export type GQLType = GQLBaseType | Function;