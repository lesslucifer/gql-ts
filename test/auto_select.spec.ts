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

describe("Auto Select", () => {
    let gql: GQL;

    beforeEach(() => {
        gql = new GQL();
        gql.add(GQLModel1);
        gql.add(GQLModel2);
    });

    it('should auto-select normal fields', () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'id')).toThrow();
    });

    it('should not auto-select fields with autoSelect: false', () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'id2')).not.toThrow();
    });

    it('should not auto-select sub-select fields by default', () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'model2.id' as any)).not.toThrow();
    });

    it('should auto-select sub-select fields with autoSelect: true', () => {
        const query = {
            $fields: '*'
        };

        const gqlQuery = gql.queryFromHttpQuery(query, GQLModel1);
        expect(() => GQLU.blackListSelect(gqlQuery, 'model3')).toThrow();
    });
});