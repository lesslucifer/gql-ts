import { isObject } from 'lodash';
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
            throw Error(`Invalid select! Field ${field} is not defined`);
        }
        this.spec = keySpec;

        // TODO
        this.type = keySpec.type;
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

    constructor(gql: GQL, target: Function, data: Object)  {
        this.gql = gql;
        this.target = target;
        this.fields = [];
        for (const f of Object.keys(data)) {
            const fieldData = data[f];
            if (fieldData) {
                this.fields.push(new GQLFieldSelect(this.gql, target, f, data[f]));
            }
        }
    }

    get(field: string) {
        return this.fields.find(f => f.field == field);
    }

    static selectAll(model: IGQLModelClass): GQLSelect {
        const select = new GQLSelect(model.gql, model, {});
        model.spec.keys.forEach(k => select.fields.push(new GQLFieldSelect(model.gql, model, k.key, true)));
        return select;
    }
}