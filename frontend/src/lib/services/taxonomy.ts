/**
 * Category service. Tries the taxonomy vocabulary first (term-reference
 * sites); if it doesn't exist, derives the category list from the values
 * actually used on products (list_string sites like this one). Either
 * way the result stays schema-driven — no hard-coded category lists.
 */
import { deserialize, drupalFetch } from "@/lib/drupal/client";

const VOCABULARY = process.env.DRUPAL_CATEGORY_VOCABULARY ?? "product_category";
const BUNDLE = process.env.DRUPAL_PRODUCT_BUNDLE ?? "default";
const CATEGORY_FIELD = process.env.DRUPAL_CATEGORY_FIELD ?? "field_store_category";

export type Category = { id: string; name: string; slug: string };

export async function getCategories(): Promise<Category[]> {
  const fromTaxonomy = await categoriesFromTaxonomy();
  if (fromTaxonomy.length) return fromTaxonomy;
  return categoriesFromProducts();
}

async function categoriesFromTaxonomy(): Promise<Category[]> {
  try {
    const doc = await drupalFetch(`/jsonapi/taxonomy_term/${VOCABULARY}`, {
      query: { sort: "weight,name", "page[limit]": 50 },
      tags: ["categories"],
    });
    return deserialize(doc).map((term) => ({
      id: term.id,
      name: String(term.name ?? ""),
      slug: String(term.name ?? ""),
    }));
  } catch {
    return [];
  }
}

async function categoriesFromProducts(): Promise<Category[]> {
  try {
    const doc = await drupalFetch(`/jsonapi/commerce_product/${BUNDLE}`, {
      query: {
        [`fields[commerce_product--${BUNDLE}]`]: CATEGORY_FIELD,
        "page[limit]": 100,
      },
      tags: ["categories", "products"],
    });
    const values = new Set<string>();
    for (const entity of deserialize(doc)) {
      const value = entity[CATEGORY_FIELD];
      if (typeof value === "string" && value) values.add(value);
    }
    return [...values].sort().map((value) => ({
      id: value,
      name: value.charAt(0).toUpperCase() + value.slice(1),
      slug: value,
    }));
  } catch {
    return [];
  }
}
