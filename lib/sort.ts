import { GQL, GQLModel, IGQLModelClass } from './model';

export type GQLSortOrder = 'ASC' | 'DESC' | any;

export class GQLSortField<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    field: keyof M;
    order: GQLSortOrder;

    constructor(field: keyof M, order: GQLSortOrder) {
        this.field = field;
        this.order = order;
    }

    get OrderNumber() {
        return this.order === 'ASC' ? 1 : this.order === 'DESC' ? -1 : this.order;
    }
}

export class GQLSort<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    readonly gql: GQL;
    readonly target: IGQLModelClass<T, M>;
    readonly fields: GQLSortField<T, M>[];

    constructor(gql: GQL, target: IGQLModelClass<T, M>, fields: any[])  {
        this.gql = gql;
        this.target = target;
        this.fields = (fields || []).map(f => new GQLSortField(f.field, f.order));
    }

    addField(field: keyof M, order: GQLSortOrder) {
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