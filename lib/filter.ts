import { isArray } from "lodash";
import { GQLModel } from "./model";

export class GQLFieldFilter {
    readonly field: string;
    private value: any[];

    static EmptyFilter(field: string) {
        return new GQLFieldFilter(field, []);
    }

    constructor(field: string, value: any) {
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

export class GQLFilter {
    constructor(data: Object) {
        for (const f of Object.keys(data || {})) {
            const fieldData = data[f];
            this.filters.push(new GQLFieldFilter(f, fieldData));
        }
    }

    get(k: string) {
        return this.filters.find(f => f.field == k) || GQLFieldFilter.EmptyFilter(k);
    }

    add(fielFilter: GQLFieldFilter) {
        const idx = this.filters.findIndex(f => f.field == fielFilter.field);
        if (idx >= 0) {
            this.filters[idx] = fielFilter;
        }
        else {
            this.filters.push(fielFilter);
        }
    }

    addFieldFilter(field: string, value: any) {
        this.add(new GQLFieldFilter(field, value));
    }

    readonly filters: GQLFieldFilter[] = [];
}
