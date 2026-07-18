/**
 * JSON:API client for Drupal.
 *
 * Every request goes through drupalFetch(), which:
 * - builds the JSON:API URL with query params,
 * - uses Next.js fetch caching with cache TAGS, so the Drupal
 *   smartgrids_revalidate module can invalidate exactly what changed,
 * - deserializes the JSON:API document (resolving `included`) into plain
 *   objects the UI can consume.
 */

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888";

export class DrupalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "DrupalApiError";
  }
}

export type JsonApiResource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<
    string,
    { data: { id: string; type: string } | { id: string; type: string }[] | null }
  >;
};

export type JsonApiDocument = {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  links?: { next?: { href: string } };
  meta?: { count?: number };
};

/** A deserialized resource: attributes flattened, relationships resolved. */
export type DrupalEntity = {
  id: string;
  type: string;
  [key: string]: unknown;
};

function resolveResource(
  resource: JsonApiResource,
  includedIndex: Map<string, JsonApiResource>,
  depth = 0,
): DrupalEntity {
  const entity: DrupalEntity = { id: resource.id, type: resource.type, ...resource.attributes };
  if (resource.relationships && depth < 3) {
    for (const [field, rel] of Object.entries(resource.relationships)) {
      if (!rel.data) {
        entity[field] = null;
        continue;
      }
      const resolveOne = (ref: { id: string; type: string }) => {
        const included = includedIndex.get(`${ref.type}:${ref.id}`);
        return included
          ? resolveResource(included, includedIndex, depth + 1)
          : ({ id: ref.id, type: ref.type } as DrupalEntity);
      };
      entity[field] = Array.isArray(rel.data) ? rel.data.map(resolveOne) : resolveOne(rel.data);
    }
  }
  return entity;
}

export function deserialize(doc: JsonApiDocument): DrupalEntity[] {
  const index = new Map<string, JsonApiResource>();
  for (const inc of doc.included ?? []) {
    index.set(`${inc.type}:${inc.id}`, inc);
  }
  const data = Array.isArray(doc.data) ? doc.data : [doc.data];
  return data.filter(Boolean).map((r) => resolveResource(r, index));
}

export type DrupalFetchOptions = {
  /** Query params; array values expand to repeated `key[]` entries. */
  query?: Record<string, string | number | string[] | undefined>;
  /** Next.js cache tags — invalidated by Drupal via /api/revalidate. */
  tags?: string[];
  /** Fallback time-based revalidation (seconds). Default 1 hour. */
  revalidate?: number;
};

export async function drupalFetch(
  path: string,
  { query = {}, tags = [], revalidate = 3600 }: DrupalFetchOptions = {},
): Promise<JsonApiDocument> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(`${key}[]`, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/vnd.api+json" },
    next: { tags: ["drupal", ...tags], revalidate },
  });

  if (!response.ok) {
    throw new DrupalApiError(
      `Drupal request failed: ${response.status} ${response.statusText}`,
      response.status,
      url.toString(),
    );
  }
  return (await response.json()) as JsonApiDocument;
}

/** Turns a Drupal-relative file URL into an absolute one. */
export function absoluteUrl(uri: string | undefined | null): string | null {
  if (!uri) return null;
  return uri.startsWith("http") ? uri : `${BASE_URL}${uri}`;
}
