import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();

export type BlogData = {
  id: string,
  name: string,
};

export type UserData = {
  id: string,
  name: string,
  email: string,
};

export type PostData = {
  id: string,
  blogId: string,
  title: string,
  excerpt: string,
  authorId: string,
};

const blogs: BlogData[] = [
  {
    id: ulid(),
    name: 'Just Another Blog',
  },
];

const users: UserData[] = [
  {
    id: ulid(),
    name: 'James',
    email: 'jdrydn@@users.noreply.github.com',
  },
];

const posts: PostData[] = [
  {
    id: ulid(),
    blogId: blogs[0].id,
    authorId: users[0].id,
    title: 'Separate ways',
    excerpt: 'Here we stand, worlds apart, hearts broken in two',
  },
  {
    id: ulid(),
    blogId: blogs[0].id,
    authorId: users[0].id,
    title: 'Master of puppets',
    excerpt: 'End of passion play, crumbling away, I\'m your source of self-destruction',
  },
  {
    id: ulid(),
    blogId: blogs[0].id,
    authorId: users[0].id,
    title: 'Common people',
    excerpt: 'She came from Greece she had a thirst for knowledge, she studied sculpture at Saint Martin\'s College',
  },
];

export const data = {
  blogs,
  users,
  posts,
};

export const fetchers = {
  blogs(blogIds: string[]) {
    return data.blogs.filter(({ id }) => blogIds.includes(id)).map(({ id, ...attributes }) => ({
      type: 'blogs',
      id,
      attributes,
      links: {
        self: `/blogs/${id}`,
        authors: `/blogs/${id}/relationships/authors`,
        posts: `/blogs/${id}/relationships/posts`,
      },
    }));
  },
  posts(postIds: string[]) {
    return data.posts.filter(({ id }) => postIds.includes(id)).map(({ id, blogId, authorId, ...attributes }) => ({
      type: 'posts',
      id,
      attributes,
      relationships: {
        blog: { data: { type: 'blogs', id: blogId } },
        author: { data: { type: 'users', id: authorId } },
      },
      links: {
        self: `/posts/${id}`,
        blog: `/posts/${id}/relationships/blog`,
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
};
