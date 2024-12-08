import { uniq } from "lodash";
import "reflect-metadata";
import { GQLModelDataType, GQLType, GQL_NONE } from "./declare";
import { GQLFilter } from "./filter";
import { GQLMetaSelect } from "./meta";
import { GQL, GQLModel, IGQLModelClass } from "./model";
import { GQLPagination } from "./pagination";
import { GQLSelect } from "./select";
import { GQLSort } from "./sort";
import { GQLU } from "./utils";

export * from './declare';
export * from './decor';
export * from './filter';
export * from './meta';
export * from './model';
export * from './pagination';
export * from './select';
export * from './sort';
export * from './utils';

export interface IGQLQueryOptions {
    one?: boolean;
}

export class GQLQuery<M extends GQLModel<any, any>> {
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
        this.pagination = new GQLPagination(data.$from, data.$to, data.$limit, data.$offset, data.$page, data.$pageSize, data.$cursor);
        this.meta = new GQLMetaSelect(this.gql, this.target, data.$meta);
        this.options = {
            one: data.$options?.one === true
        };
    }

    async resolve(): Promise<M | M[]> {
        return this.options.one ? this.resolveOne() : this.resolveArray();
    }

    async resolveArray(): Promise<M[]> {
        return await this.target.resolve(this);
    }

    async resolveOne(): Promise<M> {
        const data = await this.resolveArray();
        return data.length > 0 ? data[0] : null;
    }

    resolveMeta<META = any>() {
        return this.target.meta<META>(this);
    }

    get hasMeta() {
        return this.meta.fields.length > 0;
    }

    emptyQuery<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(type: IGQLModelClass<T, M>) {
        return new GQLQuery(this.gql, type, {});
    }

    get QueryFields() {
        const spec = this.gql.get(this.target);
        return uniq([...this.select.rawFields, ...this.select.fields.map(f => f.spec.dataName).filter(name => name != GQL_NONE)]);
    }

    readonly gql: GQL;
    readonly target: IGQLModelClass<GQLModelDataType<M>, M>;
    readonly filter: GQLFilter;
    readonly select: GQLSelect<M>;
    readonly sort: GQLSort<M>;
    readonly pagination: GQLPagination;
    readonly meta: GQLMetaSelect;
    readonly options: IGQLQueryOptions;
}