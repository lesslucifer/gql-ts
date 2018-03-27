export enum GQLBaseType {
    STRING,
    INT,
    DOUBLE,
    BOOL
}

export type GQLType = GQLBaseType | Function;