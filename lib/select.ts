import { isObject, includes } from 'lodash';
import { GQLType } from "./declare";
import { GQLQuery, IGQLFieldOptions } from "./index";
import { GQL, GQLModelKeySpec, IGQLModelClass } from './model';

export class GQLFieldSelect {
    constructor(gql: GQL, target: Function, field: string, data: any) {
        this.gql = gql;
        this.target = target;
        this.field = field;

        const keySpec = gql.get(target).getKey(field)
        if (!keySpec) {
            throw Error(`Invalid select! Field (${field}) is not defined`);
        }
        this.spec = keySpec;

        // TODO
        this.type = keySpec.trueType;
        if (isObject(data)) {
            this.subQuery = new GQLQuery(this.gql, this.type, data);
            return
        }
        
        // const fieldModel = gql.get(keySpec.type as Function);
        // if (fieldModel != null && data == true) {
        //     this.subQuery = new GQLQuery(this.gql, keySpec.type, fieldModel.keys.reduce((q, ksp) => {
        //         q[ksp.key] = true;
        //         return q;
        //     }, {}));
        // }
    }

    readonly gql: GQL;
    readonly target: Function;
    readonly spec: GQLModelKeySpec;
    readonly field: string;
    readonly type?: GQLType;
    readonly subQuery?: GQLQuery;
}

export class GQLSelect {
    readonly gql: GQL;
    readonly target: Function;
    readonly fields: GQLFieldSelect[];
    readonly rawFields: string[] = [];

    constructor(gql: GQL, target: Function, data: Object)  {
        this.gql = gql;
        this.target = target;
        this.fields = [];
        for (const f of Object.keys(data || {})) {
            if (f === '*') {
                this.addAllFields();
                continue;
            }

            const fieldData = data[f];
            if (fieldData) {
                this.set(f, data[f], true);
            }
        }
    }

    private addAllFields() {
        const spec = this.gql.get(this.target);
        this.add(...spec.keys.map(k => k.key));
    }

    get(field: string) {
        return this.fields.find(f => f.field == field);
    }
    
    add(...fields: string[]) {
        for (const f of fields) {
            if (f === '*') {
                this.addAllFields();
                continue;
            }

            this.set(f, true, false);
        }
    }

    set(field: string, value: any, replace: boolean = true) {
        const idx = this.fields.findIndex(ff => ff.field == field);
        const fieldSel = new GQLFieldSelect(this.gql, this.target, field, value)
        if (idx < 0) {
            this.fields.push(fieldSel);
        }
        else if (replace == true) {
            this.fields[idx] = fieldSel;
        }
    }

    addRawField(...fields: string[]) {
        for (const f of fields) {
            if (this.rawFields.find(ff => ff == f) == null) {
                this.rawFields.push(f);
            }
        }
    }
}