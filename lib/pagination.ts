import { isObject, includes } from 'lodash';
import { GQLType } from "./declare";
import { GQLQuery, IGQLFieldOptions } from "./index";
import { GQL, GQLModelKeySpec, IGQLModelClass } from './model';

export type GQLSortOrder = 'ASC' | 'DESC';

export type GQLPaginationData = {[field: string]: any};
export class GQLPagination {
    readonly gql: GQL;
    readonly target: Function;
    readonly fields: GQLPaginationData;

    constructor(gql: GQL, target: Function, fields: GQLPaginationData)  {
        this.gql = gql;
        this.target = target;
        this.fields = fields;
    }

    addField(field: string, val: any) {
        this.fields[field] = val;
    }
}