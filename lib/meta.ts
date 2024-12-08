import { GQLQuery, GQLFilter, GQL, IGQLModelClass } from ".";

export interface IGQLMetaResolver {
    (query: GQLQuery): Promise<any>
}

export interface IGQLMetaResolverOptions {
    field: string;
    priority?: number;
    matches?: (filter: GQLFilter) => boolean;
}

export class GQLMetaResolverSpec {
    resolve: IGQLMetaResolver;
    opts: IGQLMetaResolverOptions;

    constructor(resolver: IGQLMetaResolver, opts: IGQLMetaResolverOptions) {
        this.resolve = resolver;
        this.opts = opts;
    }

    isMatch(filter: GQLFilter) {
        return !this.opts.matches || this.opts.matches(filter);
    }
}

export function defineMetaResolver(target: any, opts: IGQLMetaResolverOptions, resolveFunc: any) {
    const resolvers: GQLMetaResolverSpec[] = Reflect.getMetadata(`gql:metas`, target) || [];
    opts.priority = opts.priority || 0;
    resolvers.push(new GQLMetaResolverSpec(resolveFunc, opts));
    Reflect.defineMetadata(`gql:metas`, resolvers, target);
}

export class GQLMetaSelect {
    readonly gql: GQL;
    readonly target: IGQLModelClass<any, any>;
    readonly fields: string[] = [];

    constructor(gql: GQL, target: IGQLModelClass<any, any>, data: string[])  {
        this.gql = gql;
        this.target = target;
        this.fields = data;
    }

    get(field: string) {
        return this.fields.find(f => f == field);
    }
    
    add(...fields: string[]) {
        for (const f of fields) {
            this.set(f);
        }
    }

    set(field: string) {
        const metaSpecs = this.gql.get(this.target).getMetaResolvers(field);
        if (metaSpecs.length == 0) {
            throw Error(`Invalid select! Field (${field}) is not defined`);
        }

        const idx = this.fields.findIndex(ff => ff == field);
        if (idx < 0) {
            this.fields.push(field);
        }
    }
}