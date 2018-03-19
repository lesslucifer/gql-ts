import "reflect-metadata";
import { Dictionary } from "lodash";
import { GQLFieldFilter, GQLFilter } from "./filter";
import { GQLType } from "./declare";
import { GQLU } from "./utils";
import { GQLSelect } from "./select";
import { GQL, IGQLModelClass } from "./model";

export * from './decor';

export class GQLQuery {
    constructor(gql: GQL, data: any);
    constructor(gql: GQL, type: GQLType, data: any);
    constructor(...args: any[]) {
        this.gql = args[0];
        const data = (args.length >= 3) ? args[2] : args[1];
        this.target = (args.length >= 3) ? args[1] : this.gql.get(data.$type).model;
        
        this.filter = new GQLFilter(data.$query)
        this.select = new GQLSelect(this.gql, this.target, GQLU.filterObj(data, k => !k.startsWith('$')));
    }

    resolve<T = any>() {
        return <Promise<T[]>> this.target.resolve(this);
    }

    readonly gql: GQL;
    readonly target: IGQLModelClass;
    readonly filter: GQLFilter;
    readonly select: GQLSelect;
}