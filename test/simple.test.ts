import assert from 'assert';
import { createResolver } from '../index';
import { data, fetchers } from './simple.data';

describe('jsonapi-resolvers/simple', () => {
  describe('#empty', () => {
    it('should resolve one nothing', async () => {
      const resolve = createResolver({
        anything() {
          return [];
        },
      });

      const results = await resolve('anything', 'foobar');
      assert.deepStrictEqual(results, { data: undefined });
    });
    it('should resolve many nothings', async () => {
      const resolve = createResolver({
        anything() {
          return [];
        },
      });

      const results = await resolve('anything', ['1', '2', '3']);
      assert.deepStrictEqual(results, { data: [] });
    });
    it('should resolve one nothing & no included', async () => {
      const resolve = createResolver({
        anything() {
          return [];
        },
        more() {
          return [];
        },
      });

      const results = await resolve('anything', 'foobar', { include: ['more'] });
      // If an endpoint supports the include parameter and a client supplies it
      // The response MUST be a compound document with an included key
      // .. even if that included key holds an empty array (because the requested relationships are empty)
      assert.deepStrictEqual(results, { data: undefined, included: [] });
    });
    it('should resolve many nothings & no included', async () => {
      const resolve = createResolver({
        anything() {
          return [];
        },
        more() {
          return [];
        },
      });

      const results = await resolve('anything', ['1', '2', '3'], { include: ['more'] });
      // If an endpoint supports the include parameter and a client supplies it
      // The response MUST be a compound document with an included key
      // .. even if that included key holds an empty array (because the requested relationships are empty)
      assert.deepStrictEqual(results, { data: [], included: [] });
    });
  });

  describe('#mocked', () => {
    it('should pass through includes & fields', async () => {
      const resolve = createResolver({
        something(ids: string[], opts?: { include?: string[] }) {
          assert.deepStrictEqual(ids, ['1', '2', '3']);
          assert.deepStrictEqual(opts, {
            include: ['a', 'b', 'c'],
            fields: ['d', 'e', 'f'],
          });
          return [];
        },
      });

      const results = await resolve('something', ['1', '2', '3'], {
        include: ['a', 'b', 'c'],
        fields: { something: ['d', 'e', 'f'] },
      });
      assert.deepStrictEqual(results, { data: [], included: [] });
    });
    it('should pass through includes & fields to nested lookups', async () => {
      const resolve = createResolver({
        galaxies(ids: string[], opts: unknown) {
          assert.deepStrictEqual(ids, ['THE-MILKY-WAY']);
          assert.deepStrictEqual(opts, {
            include: ['planets'],
            fields: ['name', 'description'],
          });
          return [
            {
              type: 'galaxies',
              id: 'THE-MILKY-WAY',
              attributes: {
                name: 'The Milky Way',
                description: 'The Milky Way is the galaxy that includes the Solar System.',
              },
              relationships: {
                planets: {
                  data: [
                    { type: 'planets', id: 'VENUS' },
                    { type: 'planets', id: 'EARTH' },
                    { type: 'planets', id: 'MARS' },
                  ]
                }
              },
            },
          ];
        },
        planets(ids, { fields }) {
          assert.deepStrictEqual(ids, ['VENUS', 'EARTH', 'MARS']);
          assert.deepStrictEqual(fields, ['name', 'size']);
          return [
            {
              type: 'planets',
              id: 'VENUS',
              attributes: {
                name: 'Venus',
                size: 'LG',
              },
            },
            {
              type: 'planets',
              id: 'EARTH',
              attributes: {
                name: 'Earth',
                size: 'LG',
              },
            },
            {
              type: 'planets',
              id: 'MARS',
              attributes: {
                name: 'Mars',
                size: 'XS',
              },
            },
          ];
        },
      });

      const results = await resolve('galaxies', ['THE-MILKY-WAY'], {
        include: ['planets'],
        fields: {
          galaxies: ['name', 'description'],
          planets: ['name', 'size'],
        },
      });
      assert.deepStrictEqual(results, {
        data: [
          {
            type: 'galaxies',
            id: 'THE-MILKY-WAY',
            attributes: {
              name: 'The Milky Way',
              description: 'The Milky Way is the galaxy that includes the Solar System.',
            },
            relationships: {
              planets: {
                data: [
                  { type: 'planets', id: 'VENUS' },
                  { type: 'planets', id: 'EARTH' },
                  { type: 'planets', id: 'MARS' },
                ]
              }
            },
          },
        ],
        included: [
          {
            type: 'planets',
            id: 'VENUS',
            attributes: {
              name: 'Venus',
              size: 'LG',
            },
          },
          {
            type: 'planets',
            id: 'EARTH',
            attributes: {
              name: 'Earth',
              size: 'LG',
            },
          },
          {
            type: 'planets',
            id: 'MARS',
            attributes: {
              name: 'Mars',
              size: 'XS',
            },
          },
        ],
      });
    });
  });

  describe('#errors', () => {
    it('should throw an error if an unknown type is passed', async () => {
      const resolve = createResolver({
        anything() {
          return [];
        },
      });

      try {
        await resolve('something-else', 'foobar');
        assert.fail('Should have thrown an error');
      } catch (err: any) {
        assert.strictEqual(err.message, 'Expected type to be a valid schema type');
        assert.strictEqual(err.name, 'TypeError');
        assert.strictEqual(err.resolveType, 'something-else');
      }
    });
    it('should throw an error if an unknown list of IDs is passed', async () => {
      const resolve = createResolver({
        anything() {
          return [];
        },
      });

      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await resolve('anything', 22);
        assert.fail('Should have thrown an error');
      } catch (err: any) {
        assert.strictEqual(err.message, 'Expected ids to be a string or an array of strings');
        assert.strictEqual(err.name, 'TypeError');
      }
    });
    it('should handle an error thrown in an included resolve call', async () => {
      const resolve = createResolver({
        another() {
          return [
            {
              type: 'another',
              id: '1',
              relationships: {
                connect: { data: { type: 'something', id: '2' } },
              },
            }
          ];
        },
        something() {
          throw new Error('Something failed');
        },
      });

      try {
        await resolve('another', '1', { include: ['connect'] });
        assert.fail('Should have thrown an error');
      } catch (err: any) {
        assert.strictEqual(err.message, 'Something failed');
        assert.strictEqual(err.name, 'Error');
      }
    });
    it('should handle multiple errors thrown in an included resolve call', async () => {
      const resolve = createResolver({
        modelA() {
          return [
            {
              type: 'modelA',
              id: '1',
              relationships: {
                connectB: { data: { type: 'modelB', id: '2' } },
                connectC: { data: { type: 'modelC', id: '3' } },
              },
            }
          ];
        },
        modelB() {
          throw new Error('modelB failed');
        },
        modelC() {
          throw new Error('modelC failed');
        },
      });

      try {
        await resolve('modelA', '1', { include: ['connectB', 'connectC'] });
        assert.fail('Should have thrown an error');
      } catch (err: any) {
        assert.strictEqual(err.message, 'Some errors occurred when fetching nested data');
        assert.strictEqual(err.name, 'Error');
        assert.strictEqual(err.code, 'RESOLVE_INCLUDE_FAILED');
        assert.ok(Array.isArray(err.errors) && err.errors.length === 2, 'Expected 2 errors to be returned');

        const [innerB, innerC] = err.errors;
        assert.strictEqual(innerB.message, 'modelB failed');
        assert.strictEqual(innerC.message, 'modelC failed');
      }
    });
  });

  describe('#data', () => {
    it('should resolve one post', async () => {
      const resolve = createResolver(fetchers);
      const results = await resolve('posts', data.posts[0].id);
      assert.deepStrictEqual(results, {
        data: {
          type: 'posts',
          id: data.posts[0].id,
          attributes: {
            title: 'Separate ways',
            excerpt: 'Here we stand, worlds apart, hearts broken in two',
          },
          relationships: {
            blog: { data: { type: 'blogs', id: data.blogs[0].id } },
            author: { data: { type: 'users', id: data.users[0].id } },
          },
          links: {
            self: `/posts/${data.posts[0].id}`,
            blog: `/posts/${data.posts[0].id}/relationships/blog`,
            author: `/posts/${data.posts[0].id}/relationships/author`,
            comments: {
              href: `/posts/${data.posts[0].id}/comments`,
              title: 'Comments',
              meta: { count: 100 },
            },
          },
        },
      });
    });

    it('should resolve many posts', async () => {
      const resolve = createResolver(fetchers);
      const results = await resolve('posts', [data.posts[0].id, data.posts[1].id]);
      assert.deepStrictEqual(results, {
        data: [
          {
            type: 'posts',
            id: data.posts[0].id,
            attributes: {
              title: 'Separate ways',
              excerpt: 'Here we stand, worlds apart, hearts broken in two',
            },
            relationships: {
              blog: { data: { type: 'blogs', id: data.blogs[0].id } },
              author: { data: { type: 'users', id: data.users[0].id } },
            },
            links: {
              self: `/posts/${data.posts[0].id}`,
              blog: `/posts/${data.posts[0].id}/relationships/blog`,
              author: `/posts/${data.posts[0].id}/relationships/author`,
              comments: {
                href: `/posts/${data.posts[0].id}/comments`,
                title: 'Comments',
                meta: { count: 100 },
              },
            },
          },
          {
            type: 'posts',
            id: data.posts[1].id,
            attributes: {
              title: 'Master of puppets',
              excerpt: 'End of passion play, crumbling away, I\'m your source of self-destruction',
            },
            relationships: {
              blog: { data: { type: 'blogs', id: data.blogs[0].id } },
              author: { data: { type: 'users', id: data.users[0].id } },
            },
            links: {
              self: `/posts/${data.posts[1].id}`,
              blog: `/posts/${data.posts[1].id}/relationships/blog`,
              author: `/posts/${data.posts[1].id}/relationships/author`,
              comments: {
                href: `/posts/${data.posts[1].id}/comments`,
                title: 'Comments',
                meta: { count: 100 },
              },
            },
          }
        ]
      });
    });

    it('should resolve one post with links prefixes', async () => {
      const resolve = createResolver(fetchers, {
        links: {
          baseUrl: 'https://api.example.com/v1',
        },
      });

      const results = await resolve('posts', data.posts[0].id);
      assert.deepStrictEqual(results, {
        data: {
          type: 'posts',
          id: data.posts[0].id,
          attributes: {
            title: 'Separate ways',
            excerpt: 'Here we stand, worlds apart, hearts broken in two',
          },
          relationships: {
            blog: { data: { type: 'blogs', id: data.blogs[0].id } },
            author: { data: { type: 'users', id: data.users[0].id } },
          },
          links: {
            self: `https://api.example.com/v1/posts/${data.posts[0].id}`,
            blog: `https://api.example.com/v1/posts/${data.posts[0].id}/relationships/blog`,
            author: `https://api.example.com/v1/posts/${data.posts[0].id}/relationships/author`,
            comments: {
              href: `https://api.example.com/v1/posts/${data.posts[0].id}/comments`,
              title: 'Comments',
              meta: { count: 100 },
            },
          },
        },
      });
    });

    it('should resolve one post with the author', async () => {
      const resolve = createResolver(fetchers);
      const results = await resolve('posts', data.posts[0].id, {
        include: ['author'],
      });
      assert.deepStrictEqual(results, {
        data: {
          type: 'posts',
          id: data.posts[0].id,
          attributes: {
            title: 'Separate ways',
            excerpt: 'Here we stand, worlds apart, hearts broken in two',
          },
          relationships: {
            blog: { data: { type: 'blogs', id: data.blogs[0].id } },
            author: { data: { type: 'users', id: data.users[0].id } },
          },
          links: {
            self: `/posts/${data.posts[0].id}`,
            blog: `/posts/${data.posts[0].id}/relationships/blog`,
            author: `/posts/${data.posts[0].id}/relationships/author`,
            comments: {
              href: `/posts/${data.posts[0].id}/comments`,
              title: 'Comments',
              meta: { count: 100 },
            },
          },
        },
        included: [
          {
            type: 'users',
            id: data.users[0].id,
            attributes: {
              name: 'James',
              email: 'jdrydn@@users.noreply.github.com',
            },
            links: {
              self: `/users/${data.users[0].id}`,
              blogs: `/users/${data.users[0].id}/relationships/blogs`,
              posts: `/users/${data.users[0].id}/relationships/posts`,
            },
          },
        ],
      });
    });

    // it('should resolve many posts', async () => {
    //   const resolve = createResolver(fetchers);
    //   const results = await resolve('posts', [data.posts[0].id, data.posts[1].id]);
    //   assert.deepStrictEqual(results, {
    //     data: [
    //       {
    //         type: 'posts',
    //         id: data.posts[0].id,
    //         attributes: {
    //           title: 'Separate ways',
    //           excerpt: 'Here we stand, worlds apart, hearts broken in two',
    //         },
    //         relationships: {
    //           blog: { data: { type: 'blogs', id: data.blogs[0].id } },
    //           author: { data: { type: 'users', id: data.users[0].id } },
    //         },
    //         links: {
    //           self: `/posts/${data.posts[0].id}`,
    //           blog: `/posts/${data.posts[0].id}/relationships/blog`,
    //           author: `/posts/${data.posts[0].id}/relationships/author`,
    //           comments: {
    //             href: `/posts/${data.posts[0].id}/comments`,
    //             title: 'Comments',
    //             meta: { count: 100 },
    //           },
    //         },
    //       },
    //       {
    //         type: 'posts',
    //         id: data.posts[1].id,
    //         attributes: {
    //           title: 'Master of puppets',
    //           excerpt: 'End of passion play, crumbling away, I\'m your source of self-destruction',
    //         },
    //         relationships: {
    //           blog: { data: { type: 'blogs', id: data.blogs[0].id } },
    //           author: { data: { type: 'users', id: data.users[0].id } },
    //         },
    //         links: {
    //           self: `/posts/${data.posts[1].id}`,
    //           blog: `/posts/${data.posts[1].id}/relationships/blog`,
    //           author: `/posts/${data.posts[1].id}/relationships/author`,
    //           comments: {
    //             href: `/posts/${data.posts[1].id}/comments`,
    //             title: 'Comments',
    //             meta: { count: 100 },
    //           },
    //         },
    //       }
    //     ]
    //   });
    // });
  });
});
