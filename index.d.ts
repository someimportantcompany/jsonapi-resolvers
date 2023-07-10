/**
 * @link https://jsonapi.org/format/
 */

/**
 * A “link object” is an object that represents a web link.
 * @link https://jsonapi.org/format/#document-links-link-object
 */
export interface JsonApiLink {
  // A string whose value is a URI-reference [RFC3986 Section 4.1] pointing to the link’s target.
  href: string,
  // A string indicating the link’s relation type.
  rel?: string | undefined,
  // A link to a description document
  describedby?: string | JsonApiLink | undefined,
  // A string which serves as a label for the link such that it can be used as a human-readable identifier
  title?: string | undefined,
  // A string indicating the media type of the link’s target.
  type?: string | undefined,
  // A string or an array of strings indicating the language(s) of the link’s target.
  hreflang?: string | string[] | undefined,
  // A meta object containing non-standard meta-information about the link.
  meta?: Record<string, unknown> | undefined,
}

/**
 * Error objects provide additional information about problems encountered while performing an operation.
 * @link https://jsonapi.org/format/#error-objects
 */
export interface JsonApiError {
  // A unique identifier for this particular occurrence of the problem.
  id?: string,
  // A links object
  links?: {
    // A link that leads to further details about this particular occurrence of the problem.
    about?: string | JsonApiLink | null,
    // A link that identifies the type of error that this particular error is an instance of.
    type?: string | JsonApiLink | null,
    // Other relevant links for the error.
    [key: string]: string | JsonApiLink | null,
  } | undefined,
  // The HTTP status code applicable to this problem, expressed as a string value.
  status?: string,
  // An application-specific error code, expressed as a string value.
  code?: string,
  // A short, human-readable summary of the problem that SHOULD NOT change from between occurrences of the problem.
  title?: string,
  // A human-readable explanation specific to this occurrence of the problem.
  detail?: string,
  // An object containing references to the primary source of the error.
  source?: {
    // A JSON Pointer [RFC6901] to the value in the request document that caused the error.
    pointer?: string,
    // A string indicating which URI query parameter caused the error.
    parameter?: string,
    // A string indicating the name of a single request header which caused the error.
    header?: string,
  } | undefined,
  // A meta object containing non-standard meta-information about the error.
  meta?: Record<string, unknown> | undefined,
}

/**
 * “Resource objects” appear in a JSON:API document to represent resources.
 * @link https://jsonapi.org/format/#document-resource-objects
 */
export interface JsonApiResource {
  // Must contain a resource type.
  type: string,
  // Must contain a resource ID.
  id: string,
  // An attributes object representing some of the resource’s data.
  attributes?: Record<string, unknown> | undefined,
  // A relationships object describing relationships between the resource and other JSON:API resources.
  relationships?: Record<string, unknown> | undefined,
  // A links object containing links related to the resource.
  links?: Record<string, string | JsonApiLink | null> | undefined,
  // A meta object containing non-standard meta-information about a resource.
  meta?: Record<string, unknown> | undefined,
}

export type JsonApiRoot = ({
  // The document’s “primary data”
  // Either a single resource, an array of resources, or null.
  data?: JsonApiResource | JsonApiResource[] | null | undefined,
  // The members data and errors MUST NOT coexist in the same document.
  errors: never,
  // An array of resource objects that are related to the primary data and/or each other.
  included?: JsonApiResource[] | undefined,
} | {
  // An array of error objects.
  errors: JsonApiError[],
  // The members data and errors MUST NOT coexist in the same document.
  data: never,
  // If a document does not contain a top-level data key, the included member MUST NOT be present either.
  included: never,
}) & {
  // A meta object that contains non-standard meta-information.
  meta?: Record<string, unknown> | undefined,
  // Qn object describing the server’s implementation.
  jsonapi?: {
    // Whose value is a string indicating the highest JSON:API version supported.
    version?: string,
    // An array of URIs for all applied extensions.
    ext?: string[],
    // An array of URIs for all applied profiles.
    profile?: string[],
    // A meta object that contains non-standard meta-information.
    meta?: Record<string, unknown> | undefined,
    // A member defined by an applied extension.
    [key: string]: unknown,
  } | undefined,
  // A links object related to the primary data.
  links?: Record<string, string | JsonApiLink | null> | undefined,
  // A member defined by an applied extension.
  [key: string]: unknown,
}

export interface JsonApiLinkOpts {
  baseUrl?: string | undefined,
}

export interface JsonApiFetchResourcesOpts {
  include?: string[] | undefined,
  fields?: string[] | undefined,
}

export type JsonApiFetchResourcesFn = (ids: string[], opts: JsonApiFetchResourcesOpts) =>
  JsonApiResource[] | Promise<JsonApiResource[]>;

export interface JsonApiResolverOpts {
  fields?: Record<string, string[]> | undefined,
  links?: JsonApiLinkOpts | undefined,
}

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

  /**
   * Given an entry or a list of entries, fetch the requested included data.
   */
  included(
    data: JsonApiResource | JsonApiResource[],
    opts: { include: string[] } & JsonApiResolverOpts,
  ): Promise<JsonApiResource[] | undefined>,

  /**
   * Given an object of links, rewrite them to fit the current request.
   */
  links(
    // eslint-disable-next-line no-shadow
    links: NonNullable<JsonApiResource['links']>,
    opts: JsonApiLinkOpts,
  ): JsonApiResource['links'],
}

export interface JsonApiCreateResolverOpts {
  links?: JsonApiLinkOpts | undefined,
}

/**
 * Create a resolver from a collection of functions named-by-type.
 */
export function createResolver(
  fetchers: Record<string, JsonApiFetchResourcesFn>,
  opts?: JsonApiCreateResolverOpts,
): resolve;
