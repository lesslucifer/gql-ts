import { GQL, GQLField, GQLObject, GQLModel, GQLQuery, GQLRootResolver } from '../lib';

@GQLObject('test_model')
class TestModel extends GQLModel<any, TestModel> {
    @GQLField()
    id: string;

    @GQLField()
    name: string;

    @GQLRootResolver()
    static async rootResolver(query: GQLQuery<any, TestModel>) {
        if (query.filter.filters.length > 0) {
            return [];
        }

        return [
            { id: '1', name: 'Test 1' },
            { id: '2', name: 'Test 2' }
        ];
    }
}

describe("One Notation", () => {
    let gql: GQL;

    beforeEach(() => {
        gql = new GQL();
        gql.add(TestModel);
    });

    describe("HTTP Query", () => {
        it('should return array when $one is false', async () => {
            const query = {
                $fields: 'id,name',
                $one: 'false'
            };

            const gqlQuery = gql.queryFromHttpQuery(query, TestModel);
            const result = await gqlQuery.resolve();
            
            expect(Array.isArray(result)).toBe(true);
            expect((result as any[]).length).toBe(2);
        });

        it('should return single object when $one is true', async () => {
            const query = {
                $fields: 'id,name',
                $one: 'true'
            };

            const gqlQuery = gql.queryFromHttpQuery(query, TestModel);
            const result = await gqlQuery.resolve();
            
            expect(Array.isArray(result)).toBe(false);
            expect(result).toHaveProperty('id', '1');
        });

        it('should return null when $one is true and no results', async () => {
            const query = {
                $fields: 'id,name',
                $one: 'true'
            };

            const gqlQuery = gql.queryFromHttpQuery(query, TestModel);
            gqlQuery.filter.addFieldFilter('id', 0);
            const result = await gqlQuery.resolve();
            
            expect(result).toBeNull();
        });
    });

    describe("Direct Query", () => {
        it('should return array when options.one is false', async () => {
            const gqlQuery = new GQLQuery(gql, TestModel, {
                id: 1,
                name: 1,
                $options: {
                    one: false
                }
            });
            
            const result = await gqlQuery.resolve();
            
            expect(Array.isArray(result)).toBe(true);
            expect((result as any[]).length).toBe(2);
        });

        it('should return single object when options.one is true', async () => {
            const gqlQuery = new GQLQuery(gql, TestModel, {
                id: 1,
                name: 1,
                $options: {
                    one: true
                }
            });
            
            const result = await gqlQuery.resolve();
            expect(Array.isArray(result)).toBe(false);
            expect(result).toHaveProperty('id', '1');
        });

        it('should return null when options.one is true and no results', async () => {
            TestModel._resolve = async () => [];

            const gqlQuery = new GQLQuery(gql, TestModel, {
                id: 1,
                name: 1,
                $options: {
                    one: true
                }
            });
            
            const result = await gqlQuery.resolve();
            
            expect(result).toBeNull();
        });
    });
}); 