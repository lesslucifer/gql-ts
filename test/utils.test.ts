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

    @GQLField({type: () => GQLModel2})
    model2: GQLModel2;
}

describe("# Utils", () => {
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

    it('whitelist sub select ok', async () => {
        const query = {
            $fields: 'id'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.whiteListSelect(gqlQuery, 'id', 'model2.id')).to.be.ok;
    })

    it('whitelist sub select ok with sub', () => {
        const query = {
            $fields: 'id,model2.id'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.whiteListSelect(gqlQuery, 'id', 'model2.id')).to.be.ok;
    })

    it('whitelist sub select fail with sub', () => {
        const query = {
            $fields: 'id,model2.id'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.whiteListSelect(gqlQuery, 'id')).throw();
    })

    it('whitelist sub select fail with direct', () => {
        const query = {
            $fields: 'id,model2.id'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.whiteListSelect(gqlQuery, 'model2.id')).throw();
    })
});