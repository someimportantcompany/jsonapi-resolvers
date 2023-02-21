import { randomBytes } from 'crypto';
import { monotonicFactory } from 'ulid';

import { createResolver } from 'jsonapi-resolvers';
import type { Profiler } from './runner';

export async function run(profiler: Profiler, { postsCount, usersCount }: { postsCount: number, usersCount: number }) {
  profiler.start('setup');

  const ulid = monotonicFactory();
  const data: Record<string, any[]> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

  data.users = Array.from(new Array(usersCount)).map(() => ({
    id: ulid(),
    name: randomBytes(8).toString('hex'),
    email: randomBytes(16).toString('hex'),
  }));

  data.posts = Array.from(new Array(postsCount)).map(() => ({
    id: ulid(),
    authorId: data.users[Math.floor(Math.random() * data.users.length)].id,
    title: randomBytes(16).toString('hex'),
    excerpt: randomBytes(32).toString('hex'),
  }));

  const resolve = createResolver({
    posts(postIds: string[]) {
      return data.posts.filter(({ id }) => postIds.includes(id)).map(({ id, authorId, ...attributes }) => ({
        type: 'posts',
        id,
        attributes,
        relationships: {
          author: { data: { type: 'users', id: authorId } },
        },
        links: {
          self: `/posts/${id}`,
          author: `/posts/${id}/relationships/author`,
          comments: {
            href: `/posts/${id}/comments`,
            title: 'Comments',
            meta: { count: 100 },
          },
        },
      }));
    },
    users(userIds: string[]) {
      return data.users.filter(({ id }) => userIds.includes(id)).map(({ id, ...attributes }) => ({
        type: 'users',
        id,
        attributes,
        links: {
          self: `/users/${id}`,
          blogs: `/users/${id}/relationships/blogs`,
          posts: `/users/${id}/relationships/posts`,
        },
      }));
    },
  });

  profiler.end('setup');

  profiler.start('single');
  await resolve('posts', data.posts[0].id);
  profiler.end('single');

  profiler.start('double');
  await resolve('posts', [data.posts[0].id, data.posts[1].id]);
  profiler.end('double');

  profiler.start('all');
  await resolve('posts', data.posts.map(({ id }) => id));
  profiler.end('all');

  profiler.start('single:included');
  await resolve('posts', data.posts[0].id, { include: ['author'] });
  profiler.end('single:included');

  profiler.start('double:included');
  await resolve('posts', [data.posts[0].id, data.posts[1].id], { include: ['author'] });
  profiler.end('double:included');

  profiler.start('all:included');
  await resolve('posts', data.posts.map(({ id }) => id), { include: ['author'] });
  profiler.end('all:included');
}
