/**
 * Server-side client for the Drupal storefront API.
 *
 * Everything is fetched ONCE per page render and cached with Next tags —
 * one stats request serves every product card on a page (no per-card
 * calls). Drupal invalidates the tags via the revalidation webhook when
 * purchases, downloads, reviews or rates change.
 */
import type {
  CollectionKey,
  RatesPayload,
  ReviewsPayload,
  StatsPayload,
} from "@/types/storefront";

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888";

async function storefrontFetch<T>(path: string, tags: string[], revalidate = 3600): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    next: { tags: ["drupal", ...tags], revalidate },
  });
  if (!response.ok) {
    throw new Error(`Storefront API ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

const EMPTY_STATS: StatsPayload = {
  stats: {},
  meta: {
    show_purchase_count: false,
    show_download_count: false,
    show_ratings: false,
    purchase_label: "@count sold",
    download_label: "@count downloads",
  },
};

export async function getStats(): Promise<StatsPayload> {
  try {
    const payload = await storefrontFetch<StatsPayload>("/api/storefront/stats", ["stats"]);
    // Drupal serialises an empty map as [] — normalise it.
    if (Array.isArray(payload.stats)) payload.stats = {};
    return payload;
  } catch {
    return EMPTY_STATS;
  }
}

export async function getRates(): Promise<RatesPayload | null> {
  try {
    return await storefrontFetch<RatesPayload>("/api/storefront/rates", ["rates"]);
  } catch {
    return null;
  }
}

export type CatalogQuery = {
  sort?: string;
  q?: string;
  category?: string;
  onSale?: boolean;
  limit?: number;
  offset?: number;
};

export type CatalogResult = { uuids: string[]; total: number; sort: string };

/**
 * Server-side catalogue query: Drupal filters, sorts (including
 * stat-driven sorts) and paginates in SQL, returning one page of ordered
 * product UUIDs. Never loads the whole catalogue into the browser.
 */
export async function getCatalog(query: CatalogQuery): Promise<CatalogResult> {
  const params = new URLSearchParams();
  if (query.sort) params.set("sort", query.sort);
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.onSale) params.set("on_sale", "1");
  params.set("limit", String(query.limit ?? 24));
  params.set("offset", String(query.offset ?? 0));

  try {
    return await storefrontFetch<CatalogResult>(
      `/api/storefront/catalog?${params.toString()}`,
      ["products", "stats"],
    );
  } catch {
    return { uuids: [], total: 0, sort: query.sort ?? "newest" };
  }
}

export async function getCollectionUuids(key: CollectionKey, limit = 12): Promise<string[]> {
  try {
    const payload = await storefrontFetch<{ uuids: string[] }>(
      `/api/storefront/collections/${key}?limit=${limit}`,
      ["stats", "products"],
    );
    return payload.uuids ?? [];
  } catch {
    return [];
  }
}

export async function getReviews(productUuid: string): Promise<ReviewsPayload> {
  try {
    return await storefrontFetch<ReviewsPayload>(`/api/storefront/reviews/${productUuid}`, [
      "reviews",
      `reviews:${productUuid}`,
    ]);
  } catch {
    return { total: 0, reviews: [] };
  }
}
