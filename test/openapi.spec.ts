import { GQL, GQLField, GQLFieldArraySchema, GQLFieldExtraSchema, GQLFieldSchema, GQLModel, GQLObject, GQLObjectSchema } from '../lib';

@GQLObject('user')
class User extends GQLModel<any, User> {
    @GQLField()
    id: string;

    @GQLField({ schemaRequiredFields: true })
    id2: string;

    @GQLField({ schemaRequiredFields: true })
    name: string;

    @GQLField({ schemaRequiredFields: true })
    age: number;

    @GQLField()
    anyField: any;

    @GQLField({ schema: {
        'type': 'string',
        'minLength': 10
    } })
    customSchema: string;

    @GQLField({ extraSchema: {
        'maxLength': 14,
        'pattern': '^UNH'
    } })
    extraSchema: string;

    @GQLFieldSchema({
        'type': 'string',
        'minLength': 10
    })
    @GQLField()
    customSchema2: string;

    @GQLFieldExtraSchema({
        'maxLength': 14,
        'pattern': '^UNH'
    })
    @GQLField()
    extraSchema2: string;

    @GQLFieldArraySchema({
        'type': 'string'
    }, {minItems: 1})
    @GQLField()
    arrSchema: string[];
}

@GQLObjectSchema({
    extraSchema: {
        'additionalProperites': false
    },
    ref: '#/components/objects/Item'
})
@GQLObject('item')
class Item extends GQLModel<any, Item> {
    @GQLField()
    id: string;
    
    @GQLField()
    sku: string;
    
    @GQLField()
    price: number;
}

@GQLObjectSchema({
    schema: {
        'type': 'array',
        'items': {
            'type': 'string'
        }
    }
})
@GQLObject('payment')
class Payment extends GQLModel<any, Payment> {
    @GQLField()
    id: string;
    
    @GQLField({type: () => User})
    owner: User;
    
    @GQLField()
    method: string;
}

@GQLObject('order')
class Order extends GQLModel<any, Order> {
    @GQLField()
    id: string;

    @GQLField({type: () => User})
    customer: User;

    @GQLField({type: () => Item})
    item: Item;

    @GQLField({type: () => Payment})
    payment: Payment;
}

describe("# OpenAPI", () => {
    let gql = new GQL();

    beforeAll(() => {
        gql.add(User);
        gql.add(Item);
        gql.add(Payment);
        gql.add(Order);
    })

    it('field schema', async () => {
        expect(User.openAPISchema()).toEqual({
            'type': 'object',
            'properties': {
                'id': {'type': 'string'},
                'id2': {'type': 'string'},
                'name': {'type': 'string'},
                'age': {'type': 'number'},
                'anyField': {},
                'customSchema': {
                    'type': 'string',
                    'minLength': 10
                },
                'extraSchema': {
                    'type': 'string',
                    'maxLength': 14,
                    'pattern': '^UNH'
                },
                'customSchema2': {
                    'type': 'string',
                    'minLength': 10
                },
                'extraSchema2': {
                    'type': 'string',
                    'maxLength': 14,
                    'pattern': '^UNH'
                },
                'arrSchema': {
                    'type': 'array',
                    'items': {
                        'type': 'string'
                    },
                    'minItems': 1
                }
            },
            'requiredProperties': ['id2', 'name', 'age']
        })
    })

    it('object schema', async () => {
        expect(Item.openAPISchema()).toEqual({
            'type': 'object',
            'properties': {
                'id': {'type': 'string'},
                'sku': {'type': 'string'},
                'price': {'type': 'number'},
            },
            'additionalProperites': false
        })
        expect(Payment.openAPISchema()).toEqual({
            'type': 'array',
            'items': {
                'type': 'string'
            }
        })
    })

    it('ref', async () => {
        expect(Order.openAPISchema()).toEqual({
            'type': 'object',
            'properties': {
                'id': {'type': 'string'},
                'customer': {'$ref': '#/components/schemas/user'},
                'item': {'$ref': '#/components/objects/Item'},
                'payment': {'$ref': '#/components/schemas/payment'},
            }
        })
    })
});