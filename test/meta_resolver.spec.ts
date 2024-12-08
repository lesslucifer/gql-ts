import { GQL, GQLField, GQLObject, GQLU, GQLMetaResolver, GQLQuery, GQLModel, GQLRootResolver } from '../lib';

@GQLObject('test_model')
class GQLTestModel extends GQLModel<any, GQLTestModel> {
    @GQLField()
    id: string;

    @GQLField()
    name: string;

    @GQLRootResolver()
    static rootResolve(query: GQLQuery<GQLTestModel>) {
        return [];
    }

    @GQLMetaResolver({field: 'total', matches: GQLU.byFields(['id'], [])})
    static metaById(query: GQLQuery<GQLTestModel>) {
        return 100;
    }
}

describe("GQLMetaResolver", () => {
    let gql: GQL;

    beforeEach(() => {
        gql = new GQL();
        gql.add(GQLTestModel);
    });

    it('should get meta successfully', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total',
            id: '0'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        const meta = await gqlQuery.resolveMeta();
        expect(meta).toEqual(expect.objectContaining({total: 100}));
    });

    it('should reject when meta field not found', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total2',
            id: '0'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        await expect(gqlQuery.resolveMeta()).rejects.toThrow();
    });

    it('should return empty object for invalid filter', async () => {
        const query = {
            $fields: 'id',
            $meta: 'total',
            id: '0',
            name: 'hello'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        expect(await gqlQuery.resolveMeta()).toEqual({});
    });

    it('should indicate hasMeta when meta is present', () => {
        const query = {
            $fields: 'id',
            $meta: 'total',
            id: '0',
            name: 'hello'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        expect(gqlQuery.hasMeta).toBe(true);
    });

    it('should indicate no hasMeta when meta is absent', () => {
        const query = {
            $fields: 'id',
            id: '0',
            name: 'hello'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLTestModel);
        expect(gqlQuery.hasMeta).toBe(false);
    });
});