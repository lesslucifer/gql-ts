import { isObject, includes } from 'lodash';
import { GQLType } from "./declare";
import { GQLQuery, IGQLFieldOptions } from "./index";
import { GQL, GQLModelKeySpec, IGQLModelClass } from './model';

export type GQLSortOrder = 'ASC' | 'DESC';

export class GQLSortField {
    field: string;
    order: GQLSortOrder;

    constructor(field: string, order: GQLSortOrder) {
        this.field = field;
        this.order = order;
    }

    get OrderNumber() {
        return this.order == 'ASC' ? 1 : -1;
    }
}

export class GQLSort {
    readonly gql: GQL;
    readonly target: Function;
    readonly fields: GQLSortField[];

    constructor(gql: GQL, target: Function, fields: any[])  {
        this.gql = gql;
        this.target = target;
        this.fields = (fields || []).map(f => new GQLSortField(f.field, f.order));
    }

    addField(field: string, order: GQLSortOrder) {
        let sortField = this.fields.find(f => f.field == field);
        if (sortField) {
            sortField.order = order;
        }
        else {
            sortField = new GQLSortField(field, order);
            this.fields.push(sortField);
        }
    }
}