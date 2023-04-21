export type JsonApiLink = string | {
  href: string,
  title?: string | undefined,
  meta?: Record<string, unknown> | undefined,
  describedby?: JsonApiLink | undefined,
  type?: string | undefined,
  hreflang?: string | string[] | undefined,
  rel?: string | undefined,
};

export type JsonApiResource = {
  type: string,
  id: string,
  attributes?: Record<string, unknown> | undefined,
  relationships?: Record<string, unknown> | undefined,
  meta?: Record<string, unknown> | undefined,
  links?: Record<string, JsonApiLink | null> | undefined,
}

export type JsonApiLinkOpts = {
  baseUrl?: string | undefined,
};

export type JsonApiFetchResourcesOpts = {
  include?: string[] | undefined,
  fields?: string[] | undefined,
};

export type JsonApiFetchResourcesFn = (ids: string[], opts: JsonApiFetchResourcesOpts) =>
  JsonApiResource[] | Promise<JsonApiResource[]>;

export type JsonApiResolverOpts = {
  fields?: Record<string, string[]> | undefined,
  links?: JsonApiLinkOpts | undefined,
};

/**
 * Resolve one-or-more entries of a given type.
 */
interface resolve {
  /**
   * Resolve one entry of a given type.
   */
  (type: string, id: string, opts?: JsonApiResolverOpts):
    Promise<{ data: JsonApiResource | undefined }>,
  /**
   * Resolve some entries of a given type.
   */
  (type: string, ids: string[], opts?: JsonApiResolverOpts):
    Promise<{ data: JsonApiResource[] }>,
  /**
   * Resolve one entry of a given type, including its related data.
   */
  (type: string, id: string, opts: { include: string[] } & JsonApiResolverOpts):
    Promise<{ data: JsonApiResource | undefined, included: JsonApiResource[] }>,
  /**
   * Resolve some entries of a given type, including their related data.
   */
  (type: string, ids: string[], opts: { include: string[] } & JsonApiResolverOpts):
    Promise<{ data: JsonApiResource[], included: JsonApiResource[] }>,
}

namespace resolve {
  export function included(
    data: JsonApiResource | JsonApiResource[],
    opts: { include: string[] } & JsonApiResolverOpts,
  ): Promise<JsonApiResource[] | undefined>

  export function links(
    // eslint-disable-next-line no-shadow
    links: NonNullable<JsonApiResource['links']>,
    opts: JsonApiLinkOpts,
  ): JsonApiResource['links']
}

export type JsonApiCreateResolverOpts = {
  links?: JsonApiLinkOpts | undefined,
};

/**
 * Create a resolver from a collection of functions named-by-type.
 */
export function createResolver(
  fetchers: Record<string, JsonApiFetchResourcesFn>,
  opts?: JsonApiCreateResolverOpts,
): resolve;
