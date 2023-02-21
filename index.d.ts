type JsonApiResource = {
  type: string,
  id: string,
  attributes?: Record<string, unknown>,
  relationships?: Record<string, unknown>,
  meta?: Record<string, unknown>,
  links?: Record<string, unknown>,
}

export type JsonApiFetchResourcesOpts = {
  include?: string[],
  fields?: string[],
};

export type JsonApiFetchResourcesFn = (ids: string[], opts: JsonApiFetchResourcesOpts) =>
  JsonApiResource[] | Promise<JsonApiResource[]>;

export type JsonApiResolverOpts = {
  fields?: Record<string, string[]>,
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

export type JsonApiCreateResolverOpts = {
  links?: {
    baseUrl?: string,
  },
};

/**
 * Create a resolver from a collection of functions named-by-type.
 */
export function createResolver(
  fetchers: Record<string, JsonApiFetchResourcesFn>,
  opts?: JsonApiCreateResolverOpts,
): resolve;
