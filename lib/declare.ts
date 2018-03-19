export enum GQLBaseType {
    STRING,
    INT,
    DOUBLE,
    BOOL
}

export type GQLType = GQLBaseType | Function;

export interface IGQLResolverDataModel<T, M> {
    data: T;
    model: M;
}