# jsonapi-resolvers

Build a resolving function to help you resolve JSON-API entities. With support for selecting specific `fields` & recursively `include`-ing related documents.

```js
const { createResolver } = require('jsonapi-resolvers');
// Or
import { createResolver } from 'jsonapi-resolvers';

const resolve = createResolver({
  posts(ids) {
    // Fetch posts by ID in the JSONAPI format
  },
  users(ids) {
    // Fetch users by ID in the JSONAPI format
  },
});

// Fetch a single post by ID
const { data } = await resolve('posts', '1234');
// { data: { type: 'posts', id: '1234', ... } }

// Fetch multiple posts by ID
const { data } = await resolve('posts', ['1234', '5678']);
// { data: [
//    { type: 'posts', id: '1234', ... },
//    { type: 'posts', id: '5678', ... } ] }

// Fetch a single post by ID, including users too
const { data } = await resolve('posts', '1234', {
  include: ['author'],
});
// { data: { type: 'posts', id: '1234', ... },
//   included: [ { type: 'users', id: 'abcd' } ]}

// Fetch multiple posts by ID, including users too
const { data } = await resolve('posts', ['1234', '5678']);
// { data: [
//    { type: 'posts', id: '1234', ... },
//    { type: 'posts', id: '5678', ... } ],
//   included: [ { type: 'users', id: 'abcd' } ]}
```

## Install

```sh
$ npm install jsonapi-resolvers
# or
$ yarn add jsonapi-resolvers
```

## API

### `createResolver(fetchers, opts?) => resolve`

Create a resolve function for a set of types.

Argument | Type | Description
---- | ---- | ----
`fetchers` | `Record<string, ResolveFunction>` | (**Required**) A dictionary of resolvers, where the name of each function should be the name of the type.
`opts?.links?.baseUrl` | `string` | If set, if `links` are included in the resolver responses they will be prepended by this `baseUrl` value. See [Rewriting `links`](#rewriting-links).

- Description of Resolve functions

### `resolve(type, id, opts?)`

Argument | Type | Description
---- | ---- | ----
`type` | `string` | (**Required**) The entry type you wish to resolve.
`id`/`ids` | `string`/`string[]` | (**Required**) The entry ID or IDs you wish to resolve.
`opts?.include` | `string[]` | An array of relationships you wish to expand
`opts?.fields` | `Record<string, string[]>` | A list of fields you'd like to return for each type, see [selecting fields](#selecting-fields).

## Usage

### Selecting fields

### Rewriting `links`

## Notes

- For more information on the JSONAPI specification, [please see here](https://jsonapi.org/format/).
- Questions? Please [open an issue](https://github.com/jdrydn/jsonapi-resolvers/issues).
