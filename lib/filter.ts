import { isArray } from "lodash";
import { GQLModel } from "./model";

export class GQLFieldFilter<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    readonly field: keyof M;
    private value: any[];

    static EmptyFilter<T = any, M extends GQLModel<T, any> = GQLModel<T, any>>(field: keyof M) {
        return new GQLFieldFilter(field, []);
    }

    constructor(field: keyof M, value: any) {
        this.field = field;
        if (isArray(value)) {
            this.value = value;
        }
        else {
            this.value = [value];
        }
    }
    
    first<T>(): T {
        return this.value[0]
    }

    batch<T>(): T[] {
        return this.value;
    }

    get isEmpty() {
        return this.value.length == 0;
    }
}

export class GQLFilter<T = any, M extends GQLModel<T, any> = GQLModel<T, any>> {
    constructor(data: Object) {
        for (const f of Object.keys(data || {})) {
            const fieldData = data[f];
            this.filters.push(new GQLFieldFilter(f as keyof M, fieldData));
        }
    }

    get(k: keyof M) {
        return this.filters.find(f => f.field == k) || GQLFieldFilter.EmptyFilter(k);
    }

    add(fielFilter: GQLFieldFilter<T, M>) {
        const idx = this.filters.findIndex(f => f.field == fielFilter.field);
        if (idx >= 0) {
            this.filters[idx] = fielFilter;
        }
        else {
            this.filters.push(fielFilter);
        }
    }

    addFieldFilter(field: keyof M, value: any) {
        this.add(new GQLFieldFilter(field, value));
    }

    readonly filters: GQLFieldFilter<T, M>[] = [];
}