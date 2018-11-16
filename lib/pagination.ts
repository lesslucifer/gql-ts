import { isObject, includes } from 'lodash';
import { GQLType } from "./declare";
import { GQLQuery, IGQLFieldOptions } from "./index";
import { GQL, GQLModelKeySpec, IGQLModelClass } from './model';

export type GQLOffsetData = {[field: string]: any};
export interface IGQLOffset {
}

export class GQLPagination {
    from?: GQLOffsetData;
    to?: GQLOffsetData;
    limit?: number;
    offset?: number;

    constructor(from: GQLOffsetData, to?: GQLOffsetData, limit?: number, offest?: number) {
        this.from = from;
        this.to = to;
        this.limit = limit;
        this.offset = offest;
    }
}