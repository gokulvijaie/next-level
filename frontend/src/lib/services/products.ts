/**
 * Product service: fetches Drupal Commerce products over JSON:API and
 * normalizes them into the UI's Product type.
 *
 * Cache tags: every list is tagged "products"; single products are also
 * tagged "product:<uuid>". The Drupal revalidate module invalidates these
 * on save, so the storefront is always in sync without redeploys.
 */
import { absoluteUrl, deserialize, drupalFetch, type DrupalEntity } from "@/lib/drupal/client";
import {
  getCatalog,
  getCollectionUuids,
  getStats,
  type CatalogQuery,
} from "@/lib/services/storefront";
import type { CollectionKey } from "@/types/storefront";
import { bucketCount, type Product } from "@/types/product";

const BUNDLE = process.env.DRUPAL_PRODUCT_BUNDLE ?? "default";
const RESOURCE = `/jsonapi/commerce_product/${BUNDLE}`;

/**
 * Category field on the product. This site uses a list_string field
 * (field_store_category); a taxonomy reference field also works — the
 * normalizer handles both shapes.
 */
const CATEGORY_FIELD = process.env.DRUPAL_CATEGORY_FIELD ?? "field_store_category";

const INCLUDES = ["variations", "field_product_image"].join(",");

const THIRTY_DAYS = 30 * 24 * 3600 * 1000;

type Money = { number: string; currency_code: string } | null;

function toNumber(money: Money): number | null {
  return money ? Number.parseFloat(money.number) : null;
}

/** Maps a deserialized commerce_product entity to the Product type. */
export function normalizeProduct(entity: DrupalEntity): Product {
  const variations = (entity.variations as DrupalEntity[] | DrupalEntity | null) ?? [];
  const variationList = (Array.isArray(variations) ? variations : [variations]).filter(
    Boolean,
  ) as DrupalEntity[];
  const variation = variationList[0];

  let price = toNumber((variation?.price as Money) ?? null);
  let listPrice = toNumber((variation?.list_price as Money) ?? null);

  // Sale window (field_sale_start / field_sale_end on the variation):
  // outside the window the list price is ignored — no sale shown.
  const saleStart = variation?.field_sale_start as string | null | undefined;
  const saleEnd = variation?.field_sale_end as string | null | undefined;
  const now = Date.now();
  if (
    listPrice !== null &&
    ((saleStart && new Date(saleStart).getTime() > now) ||
      (saleEnd && new Date(saleEnd).getTime() < now))
  ) {
    listPrice = null;
  }

  // Multi-variation pricing: show the minimum with a "From" prefix.
  const allPrices = variationList
    .map((v) => toNumber((v.price as Money) ?? null))
    .filter((n): n is number => n !== null);
  const startingFrom = new Set(allPrices).size > 1;
  if (startingFrom) {
    price = Math.min(...allPrices);
    listPrice = null;
  }

  const onSale = price !== null && listPrice !== null && listPrice > price;

  const imageRel = entity.field_product_image as DrupalEntity | DrupalEntity[] | null;
  const imageEntity = (Array.isArray(imageRel) ? imageRel[0] : imageRel) as DrupalEntity | null;
  const fileUri = (imageEntity?.uri as { url?: string } | undefined)?.url;
  // JSON:API puts alt text on the relationship meta; fall back to title.
  const imageUrl = absoluteUrl(fileUri);

  // Category: either a plain list_string value or a referenced term.
  const rawCategory = entity[CATEGORY_FIELD] as
    | string
    | DrupalEntity
    | DrupalEntity[]
    | null
    | undefined;
  let category: Product["category"] = null;
  if (typeof rawCategory === "string" && rawCategory) {
    category = {
      id: rawCategory,
      name: rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1),
      slug: rawCategory,
    };
  } else if (rawCategory && typeof rawCategory === "object") {
    const term = (Array.isArray(rawCategory) ? rawCategory[0] : rawCategory) as DrupalEntity | undefined;
    if (term?.name) {
      category = { id: term.id, name: String(term.name), slug: String(term.name) };
    }
  }

  const path = (entity.path as { alias?: string } | undefined)?.alias;
  const created = String(entity.created ?? "");
  const stock = variation?.field_stock as number | null | undefined;

  return {
    id: entity.id,
    productId: (entity.drupal_internal__product_id as number | undefined) ?? null,
    variationId:
      (variation?.drupal_internal__variation_id as number | undefined) ?? null,
    title: String(entity.title ?? ""),
    path: path ?? `/product/${entity.id}`,
    image: imageUrl ? { url: imageUrl, alt: String(entity.title ?? "") } : null,
    price,
    listPrice: onSale ? listPrice : null,
    currency: ((variation?.price as Money) ?? null)?.currency_code ?? "USD",
    discountPercent: onSale && price !== null && listPrice ? Math.round((1 - price / listPrice) * 100) : null,
    category,
    rating: (entity.field_rating as number | undefined) ?? null,
    reviewCount: (entity.field_review_count as number | undefined) ?? null,
    inStock: stock === undefined || stock === null || stock > 0,
    isNew: created ? Date.now() - new Date(created).getTime() < THIRTY_DAYS : false,
    isFeatured: Boolean(entity.field_featured),
    createdAt: created,
    body: ((entity.body as { processed?: string } | undefined)?.processed ?? null),
    isFree: price === 0,
    startingFrom,
    purchaseLabel: null,
    downloadLabel: null,
  };
}

/**
 * Enriches products with aggregated statistics (ratings, purchase and
 * download counts) from ONE cached stats request — never per-card calls.
 * Visibility and label formats are admin configuration from Drupal; when
 * a statistic is hidden or zero, its label stays null (nothing artificial
 * is ever displayed).
 */
async function withStats(products: Product[]): Promise<Product[]> {
  const { stats, meta } = await getStats();
  return products.map((product) => {
    const s = stats[product.id];
    if (!s) return product;
    return {
      ...product,
      rating: meta.show_ratings && s.rating_avg ? s.rating_avg : product.rating,
      reviewCount: meta.show_ratings && s.review_count ? s.review_count : product.reviewCount,
      purchaseLabel:
        meta.show_purchase_count && s.purchases
          ? meta.purchase_label.replace("@count", bucketCount(s.purchases))
          : null,
      downloadLabel:
        meta.show_download_count && s.downloads
          ? meta.download_label.replace("@count", bucketCount(s.downloads))
          : null,
    };
  });
}

export type ProductQuery = {
  sort?: string; // e.g. "-created", "variations.price__number"
  categorySlug?: string;
  featured?: boolean;
  onSale?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function getProducts(q: ProductQuery = {}): Promise<{
  products: Product[];
  total: number;
}> {
  // No status filter: JSON:API already applies entity access, and
  // `filter[status]=1` matches nothing against Commerce's boolean status.
  const query: Record<string, string | number | undefined> = {
    include: INCLUDES,
    "page[limit]": q.limit ?? 24,
    "page[offset]": q.offset ?? 0,
    sort: q.sort ?? "-created",
  };
  if (q.categorySlug) {
    query[`filter[${CATEGORY_FIELD}]`] = q.categorySlug;
  }
  if (q.featured) {
    query["filter[field_featured]"] = 1;
  }
  if (q.onSale) {
    // Products with a list price set are "on sale" by convention.
    query["filter[sale][condition][path]"] = "variations.list_price.number";
    query["filter[sale][condition][operator]"] = "IS NOT NULL";
  }
  if (q.search) {
    query["filter[search][condition][path]"] = "title";
    query["filter[search][condition][operator]"] = "CONTAINS";
    query["filter[search][condition][value]"] = q.search;
  }

  const doc = await drupalFetch(RESOURCE, { query, tags: ["products"] });
  const products = await withStats(deserialize(doc).map(normalizeProduct));
  return {
    products,
    total: doc.meta?.count ?? products.length,
  };
}

/** Loads full product data for an ordered UUID page, preserving order. */
async function productsByUuids(uuids: string[]): Promise<Product[]> {
  if (!uuids.length) return [];
  const doc = await drupalFetch(RESOURCE, {
    query: {
      include: INCLUDES,
      "filter[in][condition][path]": "id",
      "filter[in][condition][operator]": "IN",
      "filter[in][condition][value]": uuids,
      "page[limit]": uuids.length,
    },
    tags: ["products", "stats"],
  });
  const products = await withStats(deserialize(doc).map(normalizeProduct));
  const order = new Map(uuids.map((uuid, i) => [uuid, i]));
  return products.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

/**
 * Catalogue listing: Drupal's catalog endpoint sorts/filters/paginates in
 * SQL (raw numeric prices, timestamps, stat aggregates — display currency
 * conversion never affects ordering); products for the returned page load
 * in one JSON:API request.
 */
export async function getCatalogProducts(
  query: CatalogQuery,
): Promise<{ products: Product[]; total: number }> {
  const { uuids, total } = await getCatalog(query);
  try {
    return { products: await productsByUuids(uuids), total };
  } catch {
    return { products: [], total: 0 };
  }
}

/**
 * Products for a stat-driven collection (best sellers, most downloaded,
 * highest rated, most reviewed) — ordered by Drupal, fetched in ONE
 * JSON:API request via an IN filter, then re-sequenced to match.
 */
export async function getCollectionProducts(key: CollectionKey, limit = 12): Promise<Product[]> {
  const uuids = await getCollectionUuids(key, limit);
  return productsByUuids(uuids);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProductByPath(path: string): Promise<Product | null> {
  const slug = path.split("/").pop() ?? "";

  // Sites without pathauto aliases link products as /product/<uuid>.
  if (UUID_RE.test(slug)) {
    try {
      const doc = await drupalFetch(`${RESOURCE}/${slug}`, {
        query: { include: INCLUDES },
        tags: ["products", `product:${slug}`, "stats"],
      });
      const entities = deserialize(doc);
      if (!entities.length) return null;
      return (await withStats([normalizeProduct(entities[0])]))[0];
    } catch {
      return null;
    }
  }

  const doc = await drupalFetch(RESOURCE, {
    query: { include: INCLUDES, "filter[path.alias]": path, "page[limit]": 1 },
    tags: ["products", "stats"],
  });
  const entities = deserialize(doc);
  if (!entities.length) return null;
  return (await withStats([normalizeProduct(entities[0])]))[0];
}

export async function getRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  if (!product.category) return [];
  const { products } = await getProducts({ categorySlug: product.category.slug, limit: limit + 1 });
  return products.filter((p) => p.id !== product.id).slice(0, limit);
}

/** All product paths — for the sitemap and static params. */
export async function getAllProductPaths(): Promise<string[]> {
  const doc = await drupalFetch(RESOURCE, {
    query: { "fields[commerce_product--default]": "path", "page[limit]": 500 },
    tags: ["products"],
  });
  return deserialize(doc)
    .map((e) => (e.path as { alias?: string } | undefined)?.alias)
    .filter((p): p is string => Boolean(p));
}
