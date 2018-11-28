import * as _ from 'lodash';
import { expect } from 'chai';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import sinon = require('sinon');
import 'mocha';
import { GQL, GQLField, GQLObject, GQLU, GQLMetaResolver, GQLQuery, GQLModel, GQLRootResolver } from '../lib';

chai.use(chaiAsPromised);

@GQLObject('test_model')
class GQLTestModel extends GQLModel<any, GQLTestModel> {
    @GQLField()
    id: string;

    @GQLField()
    name: string;

    @GQLRootResolver()
    static rootResolve(query: GQLQuery) {
        return [];
    }

    @GQLMetaResolver({field: 'total', matches: GQLU.byFields(['id'], [])})
    static metaById(query: GQLQuery) {
        return 100;
    }
}

describe("# GQLMetaResolver", () => {
    let sandbox: sinon.SinonSandbox;
    let gql = new GQL();

    before(() => {
        gql.add(GQLTestModel);
    })

    beforeEach(async () => {
        sandbox = sinon.createSandbox();
    })

    afterEach(async () => {
        sandbox.restore();
    })

    it('get meta ok', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total',
            id: '0'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        const meta = await gqlQuery.resolveMeta();
        expect(meta).include({total: 100});
    })

    it('get meta not found should be rejected', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total2',
            id: '0'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        await expect(gqlQuery.resolveMeta()).to.be.eventually.rejected;
    })

    it('get meta invalid filter should response empty', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total',
            id: '0',
            name: 'hello'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        expect(await gqlQuery.resolveMeta()).to.eql({});
    })

    it('has meta with meta should be true', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total',
            id: '0',
            name: 'hello'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        expect(gqlQuery.hasMeta).to.be.true;
    })

    it('has meta without meta should be false', async () => {
        const query = {
            $fields: 'id',
            id: '0',
            name: 'hello'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        expect(gqlQuery.hasMeta).to.be.false;
    })
});