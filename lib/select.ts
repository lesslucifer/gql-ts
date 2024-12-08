import { isFunction, isObject } from 'lodash';
import { GQLModelDataType, GQLType } from "./declare";
import { GQLQuery } from "./index";
import { GQL, GQLModel, GQLModelKeySpec, IGQLModelClass } from './model';

export class GQLFieldSelect<M extends GQLModel<any, any>> {
    constructor(gql: GQL, target: IGQLModelClass<GQLModelDataType<M>, M>, field: keyof M, data: any) {
        this.gql = gql;
        this.target = target;
        this.field = field;

        const keySpec = gql.get(target).getKey(field)
        if (!keySpec) {
            throw Error(`Invalid select! Field (${field as string}) is not defined`);
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
    readonly target: IGQLModelClass<GQLModelDataType<M>, M>;
    readonly spec: GQLModelKeySpec;
    readonly field: keyof M;
    readonly type?: GQLType;
    readonly subQuery?: GQLQuery<any>;
}

export class GQLSelect<M extends GQLModel<any, any>> {
    readonly gql: GQL;
    readonly target: IGQLModelClass<GQLModelDataType<M>, M>;
    readonly fields: GQLFieldSelect<M>[];
    readonly rawFields: (keyof GQLModelDataType<M>)[] = [];

    constructor(gql: GQL, target: IGQLModelClass<GQLModelDataType<M>, M>, data: Object)  {
        this.gql = gql;
        this.target = target;
        this.fields = [];
        for (const f of Object.keys(data || {})) {
            if (f === '*') {
                this.addAllAutoSelectFields();
                continue;
            }

            const fieldData = data[f];
            if (fieldData) {
                this.set(f as keyof M, data[f], true);
            }
        }
    }

    private addAllAutoSelectFields() {
        const spec = this.gql.get(this.target);
        const autoSelectFields = spec.keys.filter(k => this.isAutoSelectField(k));
        if (autoSelectFields.length > 0) {
            this.add(...autoSelectFields.map(k => k.key as keyof M));
        }
    }

    private isAutoSelectField(spec: GQLModelKeySpec) {
        if (!spec) return false;
        if (spec.options && spec.options.autoSelect === true) return true;
        if (spec.options && spec.options.autoSelect === false) return false;

        if (isFunction(spec.rawType)) return false;
        return true;
    }

    get(field: keyof M) {
        return this.fields.find(f => f.field == field);
    }
    
    add(...fields: (keyof M | '*')[]) {
        for (const f of fields) {
            if (f === '*') {
                this.addAllAutoSelectFields();
                continue;
            }

            this.set(f, true, false);
        }
    }

    set(field: keyof M, value: any, replace: boolean = true) {
        const idx = this.fields.findIndex(ff => ff.field == field);
        const fieldSel = new GQLFieldSelect(this.gql, this.target, field, value)
        if (idx < 0) {
            this.fields.push(fieldSel);
        }
        else if (replace == true) {
            this.fields[idx] = fieldSel;
        }
    }

    addRawField(...fields: (keyof GQLModelDataType<M>)[]) {
        for (const f of fields) {
            if (this.rawFields.find(ff => ff == f) == null) {
                this.rawFields.push(f);
            }
        }
    }
}