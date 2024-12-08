import { isObject, includes } from 'lodash';
import { GQLType } from "./declare";
import { GQLQuery, IGQLFieldOptions } from "./index";
import { GQL, GQLModelKeySpec, IGQLModelClass } from './model';

export type GQLOffsetData = {[field: string]: any};
export interface IGQLOffset {
}

export class GQLPagination {
    static readonly UNLIMITED: number = Number.MAX_SAFE_INTEGER;

    from?: GQLOffsetData;
    to?: GQLOffsetData;
    limit?: number;
    offset?: number;
    page?: number;
    pageSize?: number;
    cursor?: string;

    constructor(from: GQLOffsetData, to?: GQLOffsetData, limit?: number, offest?: number, page?: number, pageSize?: number, cursor?: string) {
        this.from = from;
        this.to = to;
        this.limit = limit;
        this.offset = offest;
        this.page = page
        this.pageSize = pageSize
        this.cursor = cursor
    }
}