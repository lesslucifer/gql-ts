import "reflect-metadata";
import { Dictionary, uniq } from "lodash";
import { GQLFieldFilter, GQLFilter } from "./filter";
import { GQLType } from "./declare";
import { GQLU } from "./utils";
import { GQLSelect } from "./select";
import { GQL, IGQLModelClass } from "./model";
import { GQLSort } from "./sort";
import { GQLPagination } from "./pagination";

export * from './decor';

export class GQLQuery {
    constructor(gql: GQL, data: any);
    constructor(gql: GQL, type: GQLType, data: any);
    constructor(...args: any[]) {
        this.gql = args[0];
        const data = (args.length >= 3) ? args[2] : args[1];
        this.target = (args.length >= 3) ? args[1] : this.gql.get(data.$type).model;
        
        this.filter = new GQLFilter(data.$query)
        const selectData = GQLU.select(GQLU.filterObj(data, k => !k.startsWith('$')), this.target.DefaultSelect);
        this.select = new GQLSelect(this.gql, this.target, selectData);
        this.sort = new GQLSort(this.gql, this.target, data.$sort);
        this.pagination = new GQLPagination(data.$from, data.$to, data.$limit);
    }

    resolve<T = any>() {
        return <Promise<T[]>> this.target.resolve(this);
    }

    emptyQuery<T = any, M = any>(type: IGQLModelClass<T, M>) {
        return new GQLQuery(this.gql, type, {});
    }

    get QueryFields() {
        const spec = this.gql.get(this.target);
        return uniq([...this.select.rawFields, ...this.select.fields.map(f => f.spec.dataName)]);
    }

    readonly gql: GQL;
    readonly target: IGQLModelClass<any, any>;
    readonly filter: GQLFilter;
    readonly select: GQLSelect;
    readonly sort: GQLSort;
    readonly pagination: GQLPagination;
}