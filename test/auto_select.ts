import * as _ from 'lodash';
import { expect } from 'chai';
import chai = require('chai');
import sinon = require('sinon');
import 'mocha';
import { GQL, GQLField, GQLObject, GQLModel, GQLU } from '../lib';

@GQLObject('model2')
class GQLModel2 extends GQLModel<any, GQLModel2> {
    @GQLField()
    id: string;
}

@GQLObject('model1')
class GQLModel1 extends GQLModel<any, GQLModel1> {
    @GQLField()
    id: string;

    @GQLField({autoSelect: false})
    id2: string;

    @GQLField({type: () => GQLModel2})
    model2: GQLModel2;

    @GQLField({type: () => GQLModel2, autoSelect: true})
    model3: GQLModel2;
}

describe("# Auto Select", () => {
    let sandbox: sinon.SinonSandbox;
    let gql = new GQL();
    gql.add(GQLModel1);
    gql.add(GQLModel2);;

    before(() => {
    })

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    })

    afterEach(async () => {
        sandbox.restore();
    })

    it('normal field is auto', async () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'id')).to.throw();
    })

    it('false auto select is not selected', async () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'id2')).to.not.throw();
    })

    it('sub select is not auto', async () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'model2.id')).to.not.throw();
    })

    it('sub select with auto = true is selected', async () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'model3')).to.throw();
    })
});