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

Resolve one or more entries of a type by calling the fetcher with an ID / list of IDs.

Argument | Type | Description
---- | ---- | ----
`type` | `string` | (**Required**) The entry type you wish to resolve.
`id`/`ids` | `string`/`string[]` | (**Required**) The entry ID or IDs you wish to resolve.
`opts?.include` | `string[]` | An array of relationships you wish to expand
`opts?.fields` | `Record<string, string[]>` | A list of fields you'd like to return for each type, see [selecting fields](#selecting-fields).
`opts?.links?.baseUrl` | `string` | If set, if `links` are included in the resolver responses they will be prepended by this `baseUrl` value. See [Rewriting `links`](#rewriting-links).

- If you pass `opts.include`, [`resolve.included`](#resolveincludeddata-opts) will be called on your results automatically.
- If you pass `opts.links` to either [`createResolver`](#createresolverfetchers-opts--resolve) or this function, `resolve.links` will be called automatically.

### `resolve.included(data, opts)`

Given this entry or list of entries, fetch the requested included data.

Argument | Type | Description
---- | ---- | ----
`data` | `JsonApiResource`/`JsonApiResource[]` | (**Required**) The entry or list of entries to iterate over.
`opts?.include` | `string[]` | (**Required**) An array of relationships you wish to expand
`opts?.fields` | `Record<string, string[]>` | A list of fields you'd like to return for each type, see [selecting fields](#selecting-fields).
`opts?.links?.baseUrl` | `string` | If set, if `links` are included in the included responses they will be prepended by this `baseUrl` value. See [Rewriting `links`](#rewriting-links).

### `resolve.links(links, opts)`

Given an object of links, rewrite them to fit the current request.

Argument | Type | Description
---- | ---- | ----
`links` | `Record<string, JsonApiLink | null>` | (**Required**) An object of links to iterate over.
`opts?.baseUrl` | `string` | (**Required**) All links will be prepended by this `baseUrl` value. See [Rewriting `links`](#rewriting-links).

## Usage

### Inclusion of Related Resources

You can (recursively) resolve included entries by specifying the related resources in your `resolve` call.

```js
const resolve = createResolver({
  posts(ids) {
    // Fetch posts by ID in the JSONAPI format
    return [
      {
        type: 'posts',
        id: '1234',
        relationships: {
          // The author relationship is defined here
          // when you return the resolved posts
          author: { data: { type: 'users', id: 'abcd' } },
        },
      },
    ];
  },
  users(ids) {
    // Fetch users by ID in the JSONAPI format
    // Only when `author` is requested as an `include`d property
  },
});

const { data } = await resolve('posts', '1234', {
  include: ['author'],
});
// { data: { type: 'posts', id: '1234', ... },
//   included: [ { type: 'users', id: 'abcd', ... } ]}
```

You can also manually fetch a list of included entries, in cases where you have generated or built your primary data by hand & not with `resolve(...)`:

```js
const data = {
  type: 'custom.entry',
  id: 'FOO-BAR',
  relationships: {
    author: { data: { type: 'users', id: 'abcd' } },
  },
};

const included = await resolve.included(data, { include: ['author'] });
// [ { type: 'users', id: 'abcd', ... } ]
```

### Selecting fields

Pass a dict/list of fields to [`resolve`](#resolvetype-id-opts) for each entry type, which will be passed to each resolver function. You can then select/pick the exact fields you need to serve in your API response.

```js
const resolve = createResolver({
  posts(ids, { fields }) {
    // Fetch posts by ID in the JSONAPI format
    // Where fields is the array of fields for this type
  },
});

const { data } = await resolve('posts', '1234', {
  fields: {
    posts: ['title', 'excerpt'],
    users: ['name', 'email'],
  },
});

// And in your posts-by-id fetchers
// ids = ['1234']
// fields = ['title', 'excerpt']
```

### Rewriting `links`

To make working with different hostnames/paths during runtime easier, this library supports rewriting an entry's `links` property. For example, rather than passing core request logic all the way down to your `fetcher`, you can return relative URLs & rewrite the links to absolute URLs:

```js
const resolve = createResolver({
  posts(ids) {
    // Fetch posts by ID in the JSONAPI format
    return [
      {
        type: 'posts',
        id: '1234',
        links: {
          self: '/posts/1234',
          content: '/posts/1234/content',
          comments: '/comments?filter[post]=1234',
        },
      },
    ];
  },
});

const { data } = await resolve('posts', '1234', {
  links: {
    baseUrl: '/api/v1',
  },
});
// { data: {
//   type: 'posts',
//   id: '1234'
//   links: {
//     self: '/api/v1/posts/1234',
//     content: '/api/v1/posts/1234/content',
//     comments: '/api/v1/comments?filter[post]=1234' } }
```

## Notes

- For more information on the JSONAPI specification, [please see here](https://jsonapi.org/format/).
- Questions? Please [open an issue](https://github.com/someimportantcompany/jsonapi-resolvers/issues).
