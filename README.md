# gql-ts

Enables dynamic query features for your REST. Just like GraphQL but REST.
How about using:

```graphql
GET https://your.rest.api/orders?$fields=id,amount,items.length&customer_id=123&$sort=createdAt:ASC&limit=10
```

Instead of:

```graphql
POST https://your.rest.api/orders
{
	query {
			order(customer_id: 123, orderBy: { createdAt: asc }, limit: 10) {
				id,
				amount,
				items {
					length
				}
			}
		}
}
```

Or even more f*ck:

```graphql
POST https://your.rest.api/orders/get_by_customer_for_screen_abc
{
	"customer_id": "123"
}
```

GraphQL is too verbose, heavy and 100% depends on their huge libs. I just love the idea of having a dynamic endpoint that clients can customize their query.

It's the best match if you already have a REST application and want to and dynamic query feature

## Installation

- This is for typescript only. So we need [typescript](https://www.npmjs.com/package/typescript)
- [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) must be turned on (`tsconfig.json`)

```json
{
	"experimentalDecorators": true,
	"emitDecoratorMetadata": true
}
```

- Install via `npm` or `[yarn](https://www.npmjs.com/package/yarn)`:

```bash
npm install --save gql-ts
```

## Getting started

Assume we have a user model stored in [MongoDB](https://www.mongodb.com):

```typescript
interface IUser {
	_id: ObjectId;
	name: string;
	age: number;
	phoneNumber: string;
	address: string;
	email: string;
}

const UserModel = mongodb.collection<IUser>('user')

```

To start with, we define a corresponding GQL model:

```typescript
@GQLObject("user")
export class GQLUser extends GQLModel<IUser, GQLUser> {
	@GQLField()
	_id: string;

	@GQLField()
	name: string;

	@GQLField()
	age: number;

	@GQLField()
	phoneNumber: string;

	@GQLField()
	address: string;

	@GQLField()
	email: string;
}
```

Add a static resolver method to this class to handle queries. For now, just returns all users:

```typescript
@GQLRootResolver()
static rootResolve(query: GQLQuery) {
	return UserModel.find().toArray()
}
```

Next, add this model to [GQLGlobal](#gqlglobal). It's the pre-defined object to manage GQL's models:

```typescript
// Call this function somewhere in your code, just make sure it's triggered once:
function initGQL() {
	// This script to handle ObjecId -> string conversion
	GQLU.Parsers.unshift((gql, spec, val) => {
		if (spec.rawType == GQLBaseType.STRING && ObjectId.isValid(val)) {
			return  `${val}`;
		}
	});

	GQLGlobal.add(GQLUser);
}

```

Finally, let's use it in our controller, for example an `express` routing handler:

```typescript
app.get('/users', function (req, res) {
	const query = GQLGlobal.queryFromHttpQuery(q, GQLUser);
	query.resolve().then(users => res.send(users))
})
```

Now we can query to the `/users` endpoint dynamically:

```graphql
# To get all users
GET https://localhost/users?$fields=*

# To get only users' name and phone
GET https://localhost/users?$fields=name,phoneNumber
```

## Model definition

### Quick Example:

```typescript
@GQLObject("user")
export class GQLUser extends GQLModel<IUser, GQLUser> {
	@GQLField()
	_id: string;

	@GQLResolver({ matches:  () => true })
	static async rootResolve(query: GQLQuery) {
		return []
	}
}
```

### Model declaration:

A GQL model class must be decorated with `GQLObject` and extends from `GQLModel` class:

- `GQLObject` is the decoration for GQL model class. It has only one argument:
    - `name`: Name of the model, cannot be duplicated with other models
- `GQLModel<DataModel, GQLModelClass>` is the base class of every GQL model. It requires 2 generic arguments:
    - `DataModel`: class or interface of the raw data model
    - `GQLModelClass`: the current class itself

### Model components

There are 3 main components in a model:

- [GQLField](#gqlfield): Defines data fields in a model and their properties
- [GQLResolver](#gqlresolver): Functions that handle query logic. How to retrieve the data
- [GQLMapper](#gqlmapper): Functions that convert (format) data object to GQL ojbect

### `GQLField`:

Field decorator, define a field in a model, the only argument is the options of the field `IGQLFieldOptions`:

- `type: () => GQLType` (Optional): a function that returns the type of the field, can be one value of enum `GQLBaseType` or another GQL model. Default is the field's defined type.
**Note**: It must be explicitly declared if it's not primitive type.
- `dataName: string` (Optional): Name of the associated field in data object. Default is the field name.
- `tags: string[]` (Optional): Tags of the field, only used in customized logic. Default is empty.
- `autoSelect: boolean` (Optional): Whether this field is selected in wildcard (`*`) selection or not. Default is `true` if the field type is primitive, otherwise is `false`.

### `GQLResolver`:

Function decorator, indicate functions that handle queries:

- `priority: number`: A model can have multiple resolvers, use this option to indicate their order
- `matches: (GQLFilter) => boolean`: A function to verify if this resolver is able to handle the query or not. Usually, it use [GQLU.byFields](#gqlutils) helper function to apply required & optional fields logic.

A resolver function receives only one arguments, it's the [GQLQuery](#gqlquery).

### `GQLMapper`:

Usually, all fields will be mapped automatically from data object to GQL object. `GQLMapper` can be used in case of customization or association.

Example: Customize mapping for `total` field:

```typescript
@GQLObject("transaction")
export  class  GQLTransaction  extends  GQLModel<ITransaction, GQLTransaction> {

	@GQLField()
	_id: string;

	@GQLField({})
	price: number;

	@GQLField()
	quantity: number;

	@GQLField()
	total: number;

	@GQLMapper({ fields: ['total'], addRawFields: ['price', 'quantity'] })
	static async totalMapping(query: GQLQuery, transactions: GQLTransaction[]) {
		transactions.forEach(tr => tr.total = tr.raw.price * tr.raw.quantity)
		return transactions
	}
}

```

## Code samples

Some code samples for common use cases:

### Resolve query logic

```typescript
// In this example, we handle query for field `_id`
@GQLResolver({ matches:  GQLU.byFields(['_id'], []) })
static async rootResolve(query: GQLQuery) {
	// Get value of the query fields if there is
	const  ids = query.filter.get('_id').batch()
		.filter(id => ObjectID.isValid(id))
		.map(id => new ObjectID(id));

	// construct db query object, GQLU.notEmpty will omit all empty fields
	const q = GQLU.notEmpty({
		_id:  ids.length > 0 ? {$in: ids} : null
	});

	return await UserModel.find(q, { projection: query.QueryFields })
}
```

### Resolve with pagination & sort

```typescript
// Resolver for 2 fields (optional) `_id`, `phone`
@GQLResolver({ matches:  GQLU.byFields([], ['_id', 'phoneNumber']) })
static rootResolve(query: GQLQuery) {
	const  ids = query.filter.get('_id').batch().filter((id: string) =>  ObjectID.isValid(id)).map((id: string) =>  new  ObjectID(id));
	const phones = query.filter.get('phoneNumber').batch()

	// construct db query object
	const q = GQLU.notEmpty({
		_id:  ids.length > 0 ? {$in: ids} : null,
		phoneNumber:  phones.length > 0 ? {$in: phones} : null
	});

	// handle pagination
	if (query.pagination.from?._id) {
		_.set(q, '_id.$gt', new ObjectId(query.pagination.from?._id))
	}

	if (query.pagination.to?._id) {
		_.set(q, '_id.$lt', new ObjectId(query.pagination.to?._id))
	}

	const cursor = UserModel.find(q, { projection: query.QueryFields });

	// handle order by
	const sort = query.sort;
	if  (!_.isEmpty(sort)) {
		cursor.sort(sort.fields.map(f =>  ([f.field, f.OrderNumber])));
	}

	// handle limit
	if (_.isNumber(query.pagination?.limit)) {
		cursor.limit(query.pagination?.limit)
	}

	return cursor.toArray()
}

```

Too complicated ? Usually I write a helper function and use it for every resolver:

```typescript
@GQLResolver({ matches:  GQLU.byFields([], ['_id', 'phoneNumber']) })
static async rootResolve(query: GQLQuery) {
	const ids = query.filter.get('_id').batch()
		.filter(id =>  ObjectID.isValid(id))
		.map(id =>  new  ObjectID(id));

	const phones = query.filter.get('phoneNumber').batch()

	// construct db query object
	const q = GQLU.notEmpty({
		_id:  ids.length > 0 ? {$in: ids} : null,
		phoneNumber:  phones.length > 0 ? {$in: phones} : null
	});

	return await gqlMongoQuery(GQLUser, query, UserModel, q);
}
```

The helper function, this is for mongodb but you can modify it with to db driver easily:

```typescript
function gqlMongoQuery<T>(gqlModel, gqlQuery: GQLQuery, mgCollection: mongodb.Collection<T>, mgQuery: any) {
	const  gql = gqlQuery.gql
	const  spec = GQLGlobal.get(gqlModel);

	_.keys(gqlQuery.pagination.from)
		.map(k => spec.getKey(k))
		.filter(ks => ks != null && !_.isEmpty(gqlQuery.pagination.from[ks.key]))
		.forEach(ks => {
			const val = gqlQuery.pagination.from[ks.key]
			const qVal = mongodb.ObjectID.isValid(val) ? new mongodb.ObjectID(val) : GQLU.gqlParse(gql, ks, val)
			_.set(mgQuery, `${ks.key}.$gt`, qVal)
		})

	_.keys(gqlQuery.pagination.to)
	.map(k  =>  spec.getKey(k))
	.filter(ks  => ks != null && !_.isEmpty(gqlQuery.pagination.to[ks.key]))
	.forEach(ks  => {
		const val = gqlQuery.pagination.to[ks.key]
		const qVal = mongodb.ObjectID.isValid(val) ? new mongodb.ObjectID(val) : GQLU.gqlParse(gql, ks, val)
		_.set(mgQuery, `${ks.key}.$lt`, qVal)
	})

	const  cursor = mgCollection.find(mgQuery).project(GQLU.arrToObj(gqlQuery.QueryFields, f => f, f => 1));

	const  sort = gqlQuery.sort;
	if (!hera.isEmpty(sort)) {
		cursor.sort(sort.fields.map(f  => ([f.field, f.OrderNumber])));
	}

	if (_.isNumber(gqlQuery?.pagination?.limit)) {
		cursor.limit(gqlQuery?.pagination?.limit)
	}

	return cursor.toArray()
}

```

Some queries with pagination and sorting:

```graphql
# To get all users
GET https://localhost/users?$fields=*

# To get user by id
GET https://localhost/users?$fields=*&_id=609ffe100000000000000000

# To get only users with pagination
GET https://localhost/users?$fields=*&$from=_id:609ffe100000000000000000&$limit=20&$sort=_id:ASC

```

### Association mapping

There might be associations in the model and we should setup custom mapper for nested query:

```typescript
// Assume that we have 2 associated GQL objects User and Company:
@GQLObject('company')
class GQLCompnay extends GQLModel<ICompany, GQLCompany> {
	@GQLField()
	_id: string;
	
	@GQLField()
	name: string;

	@GQLResolver({matches: GQLU.byFields([], ['_id'])})
	static async rootResolve(query: GQLQuery) {
		const ids = query.filter.get('_id').batch()
			.filter(id =>  ObjectID.isValid(id))
			.map(id =>  new  ObjectID(id));
	
		// construct db query object
		const q = GQLU.notEmpty({
			_id:  ids.length > 0 ? {$in: ids} : null
		});
	
		return await gqlMongoQuery(GQLCompany, query, CompanyModel, q);
	}
}

@GQLObject('user')
class GQLUser extends GQLModel<IUser, GQLUser> {
	@GQLField()
	_id: string

	// a user will belong to a company, indicated by field: `company_id`
	@GQLField({type: () => GQLCompany, dataName: 'company_id'})
	company: GQLCompany

	@GQLResolver({matches: GQLU.byFields([], ['_id'])})
	static async rootResolve(query: GQLQuery) {
		// ... resolve by `_id`, just like above
	}
}
```

We've defined a reference for `company` field in `GQLUser` , but it's not define how exactly the data is mapped, we have to create an explicit mapper for it:

```typescript
class GQLUser extends GQLModel<IUser, GQLUser> {
	// ...
	
	@GQLMapper({fields: ['company']})
	static async companyMapping(query: GQLQuery, users: GQLUsers[]) {
		// get the list of associated company ids
		const companyIds = _.uniq(users.map(u => u.raw.company_id))

		// retreive the query and add filter for those company ids
		const subQuery = query.select.get('company')?.subQuery || query.emptyQuery(GQLCompany)
		subQuery.filter.add(new GQLFieldFilter('_id', companyIds));
    subQuery.select.addRawField('_id');

		// get the companies:
		const companies = await subQuery.resolve();

		// mapping data
		users.forEach(u => u.company = companies.find(c => c.raw._id == u.raw.company_id)
		
		return users
	}
}
```

Now we can select nested company from the user query:

```graphql
GET https://localhost/users?$fields=*,company._id,company.name
```

Still too complicated ? We have a helper decorator to handle that mapping called [GQLFieldRevMapping](#decorators) (sorry for the bad name). The case above become much simpler:

```typescript
class GQLUser extends GQLModel<IUser, GQLUser> {
	
	// ...

	@GQLField({type: () => GQLCompany, dataName: 'company_id'})
	@GQLFieldRevMapping({queryField: '_id'}) // <- here, just this line instead of a long mapper
	company: GQLCompany
}
```

### Meta resolver

Sometimes, we need to retrieve other information beside of the data (eg: `count` number of matched objects, `next`, `prev` link for pagination...). We called them `metadata` :

```typescript

@GQLObject('user')
class GQLUser extends GQLModel<IUser, GQLUser> {
	@GQLField()
	_id: string

	@GQLField()
	company_id: string;

	@GQLResolver({matches: GQLU.byFields([], ['_id', 'company'])})
	static async rootResolve(query: GQLQuery) {
		const q = this.makeDbQuery(query)
		return await gqlMongoQuery(GQLUser, query, UserModel, q)
	}

	@GQLMetaResolver({field: 'count'})
	static async metaCountResolve(query: GQLQuery) {
		const q = this.makeDbQuery(query)
		return await UserModel.count(q)
	}

	static makeDbQuery(query: GQLQuery) {
		const ids = query.filter.get('_id').batch()
			.filter(id =>  ObjectID.isValid(id))
			.map(id =>  new  ObjectID(id));

		const companyIds = query.filter.get('company_id').batch()

		return GQLU.notEmpty({
			_id:  ids.length > 0 ? {$in: ids} : null,
			company_id: companyIds.length > 0 ? {$in: companyIds} : null
		})
	}
}
```

In above example, we defined a `metadata` field called `count` that return the number of matched users for the query. Now we can query it from the HTTP request:

```graphql
GET https://localhost/users?$fields=*&company_id=1&$meta=count
```

### Permission filter

... To be added. Check [Whitelist / blacklist filters](#gqlutils)

## Other objects

### GQLUtils

`GQLU` is an utilities class used in the lib. It has many useful functions that might be very helpful during applying this lib:

- `GQLU.notEmpty(data: any, isEmpty: Function, deep: boolean)` : Returns a new object that filtered out all empty fields.
    - `data`: the object to be filter
    - `isEmpty`: function that check if an object is empty or not (default: `GQLU.isEmpty`)
    - `deep`: Deep or shallow filter (default: `false`)
- `GQLU.isEmpty(data: any)` : Checks if a data is empty or not

    ```typescript
    isEmpty(obj?: any): boolean {
        return  ((obj == null || obj === NaN || obj === false) ||
                (isString(obj) && obj.length == 0) ||
                ((obj instanceof Array) && obj.length == 0) ||
                ((obj instanceof Object) && Object.keys(obj).length == 0));
    }
    ```

- `GQLU.whiteListSelect(query: GQLQuery, ...whiteList: string[])` : Throws `GQLUnauthorizedQuery` if the query select a field that not in the passed whitelist
- `GQLU.blackListSelect(query: GQLQuery, ...blacklist: string[])` : Same as above, but for blacklist
- `GQLU.whiteListFilter(query: GQLQuery, ...whitelist: string[])` : Same as above, but for filter instead of select
- `GQLU.blackListFilter(query: GQLQuery, ...blacklist: string[])` : Same as above, for blacklist filter
- `GQLU.requireFilter(query: GQLQuery, ...requireds: string[])` : Same as above, the query must have filter on all passed fields
- `GQLU.byFields(requiredFields: string[], optionalFields?: string[])` : Returns a matching function for `GQLQuery`
    - `requiredFields`: Return `false` if the query filter doesn't have query on one of these fields
    - `optionalFields`: Return `false` if the query filter have at least one field that is not in this list or `requiredFields` list.

### GQLGlobal

`GQLGlobal` is an instance of class `GQL`. It's a repository that manage all GQL models. It means, in order to use a GQL model, it has to be added into a `GQL` object. Usually, using `GQLGLobal` is enough. But we could have multiple `GQL` object in some advance situations.

### GQLQuery

`GQLQuery` contains all information of a query. It includes:

- `select: GQLSelect`
    - `fields: GQLFieldSelect[]` : List of selected fields
        - `field: string` : Field name
        - `type: GQLType` : Type of the field
        - `subQuery: GQLQuery` : Sub query of that field if there is
    - `rawFields: string[]`: List of raw fields. Raw fields is fields should be retrieved from the raw data objects (usually selected from database in resolver)- while normal fields is fields will be responsed from the GQL
    - `get(field: string)` : Get select info of a field or null if there's none
    - `add(...fields: string[])` : Add fields into selection
    - `addRawField(...fields: string[])` : Add fields into raw selection
- `filter: GQLFilter`
    - `filters: GQLFieldFilter[]` : List of filtered fields
        - `field: string` : Name of the field
        - `first(): string` : Returns the value of the filter
        - `batch(): string[]` : return the list of the filter values
- `pagination: GQLPagination` Contains pagination information
    - `from: {[field: string]: string}` : Dictionary contains lower bound infos
    - `to: {[field: string]: string}` : Dictionary contains upper bound infos
    - `limit: number` : Limit size
    - `offset: number` : Offset / skip number
- `sort: GQLSort` : Sort / Orderby information
    - `fields: GQLSortField[]` : List of sorted fields
        - `field: string` : field name
        - `order: 'ASC' | 'DESC'`
        - `OrderNumber: number` `1` for `ASC` and `-1` for `DESC`
- `meta: GQLMetaSelect`: Metadata informat
    - `fields: string[]`: List of selected metadata fields
- `resolve(): Promise<any[]>`: Resolve the query, returns matched & processed GQL objects
- `resolveMeta(): Promise<any>` : Resolve query's metadata. Returns an objects contains selected metadata
- `hasMeta: boolean` : Whether a query has metadata or not
- `emptyQuery(model: GQLModel)`: returns an empty query for a specified models
- `QueryFields: string[]` List of field that must be retrieved in data objects. Usually it's fields that have to selected from database query in resolver.

### Decorators

Some useful decorators that helps writing GQLModel much simpler:

- `@GQLRootResolver` : If your model only have 1 resolver, use this decorator instead
- `@GQLIdenticalMapping` : Instead of using default `Parser` or `mapper`. The field value will be copied identcally from data object
- `@GQLFieldRevMapping` : Use to mapping association between models
    - `targetType: GQLModel` : Type of the target model. Default is the type of the field.
    - `queryField: string` : Name of the field in target model that is associated with the current field. Default is `'id'`
    - `extractField: string` : name of the field to get mapping value from the source objects. Default is name of the current field. Advance usecase only.
    - `extractor: (obj) => any` : Function that extracts the mapping values from the source objects. Default is getting value of the `extractField`. Advance usecase only.
    - `rawField: string`: name of the raw field to be added in the target object. Default is the `queryField`. Advance usecase only.
    - `mappingFilter(sourceObject, targetObject) => boolean` : Function determining should we map a targetObject into the sourceObject. Default is just `==` comparison between values of `extractField` from `sourceObject` and `queryField` of `targetObject`
    - `mappingFunc(sourceObject, targetObjects)`: Function determine exactly how to map from a list targetObjets into a sourceObject. Advance usecase only.

    It might look complicated. But usually, there're only 2 things we have to think about:

    - `queryField` : If the mapping field is not `id`. Eg for MongoDB: It's `_id`
    - `mappingFilter`: When the `==` is not enough. Eg for MongoDB: `ObjectId` must be compared via `equals` method

## Issue Reporting

If you have found a bug or have a feature request, feel free to report them at this repository issues section.

## Contributing

You are welcome