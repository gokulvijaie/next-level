/**
 * Section service — the schema-driven homepage.
 *
 * Editors create "section" nodes in Drupal (fields below); the storefront
 * fetches them and renders whatever exists, in whatever order. No layout
 * is hard-coded. If the content type doesn't exist yet (fresh install),
 * DEFAULT_SECTIONS keeps the homepage functional.
 *
 * Drupal content type `section` fields:
 * - field_kind (list: carousel | banner | grid | chips | recently_viewed)
 * - field_weight (integer)
 * - field_sort (text, JSON:API sort e.g. "-created")
 * - field_category (term reference, optional)
 * - field_featured (boolean), field_on_sale (boolean)
 * - field_limit (integer)
 * - field_link (link, "View all" target)
 * - field_eyebrow, field_text, field_cta (banner texts)
 * - field_banner_image (image)
 */
import { absoluteUrl, deserialize, drupalFetch, type DrupalEntity } from "@/lib/drupal/client";
import type { Section, SectionKind } from "@/types/section";

const DEFAULT_SECTIONS: Section[] = [
  {
    id: "default-trending",
    kind: "carousel",
    title: "Trending now",
    weight: 0,
    query: { sort: "-created", limit: 10 },
    link: { href: "/shop", label: "View all" },
    autoplay: true,
  },
  {
    id: "default-best-sellers",
    kind: "carousel",
    title: "Best sellers",
    weight: 1,
    query: { collection: "best_sellers", limit: 10 },
    link: { href: "/shop", label: "View all" },
    autoplay: true,
  },
  {
    id: "default-top-rated",
    kind: "carousel",
    title: "Top rated",
    weight: 2,
    query: { collection: "highest_rated", limit: 10 },
    link: { href: "/shop", label: "View all" },
  },
  {
    id: "default-sale",
    kind: "carousel",
    title: "Deals for you",
    weight: 2,
    query: { onSale: true, limit: 10 },
    link: { href: "/shop?filter=sale", label: "View all" },
  },
  {
    id: "default-discover",
    kind: "discover",
    title: "Discover products",
    weight: 3,
    query: { sort: "-changed", limit: 12 },
  },
  { id: "default-recent", kind: "recently_viewed", title: "Recently viewed", weight: 4, query: {} },
];

function normalizeSection(entity: DrupalEntity): Section {
  const link = entity.field_link as { uri?: string; title?: string } | null;
  const image = entity.field_banner_image as DrupalEntity | null;
  const imageUri = (image?.uri as { url?: string } | undefined)?.url;
  const category = entity.field_category as DrupalEntity | null;

  return {
    id: entity.id,
    kind: (entity.field_kind as SectionKind) ?? "carousel",
    title: String(entity.title ?? ""),
    weight: (entity.field_weight as number | undefined) ?? 0,
    query: {
      sort: (entity.field_sort as string | undefined) || undefined,
      categorySlug: category?.name ? String(category.name) : undefined,
      featured: Boolean(entity.field_featured) || undefined,
      onSale: Boolean(entity.field_on_sale) || undefined,
      limit: (entity.field_limit as number | undefined) ?? 10,
      // Stat-driven collection key (text field, e.g. "best_sellers").
      collection:
        (entity.field_collection as Section["query"]["collection"] | undefined) || undefined,
    },
    autoplay: Boolean(entity.field_autoplay),
    link: link?.uri
      ? { href: link.uri.replace("internal:", ""), label: link.title || "View all" }
      : null,
    banner:
      (entity.field_kind as string) === "banner"
        ? {
            eyebrow: (entity.field_eyebrow as string | undefined) ?? undefined,
            text: (entity.field_text as string | undefined) ?? undefined,
            image: absoluteUrl(imageUri),
            href: link?.uri?.replace("internal:", "") ?? undefined,
            cta: link?.title ?? undefined,
          }
        : null,
  };
}

export async function getSections(): Promise<Section[]> {
  try {
    const doc = await drupalFetch("/jsonapi/node/section", {
      query: {
        include: "field_banner_image,field_category",
        sort: "field_weight",
        "page[limit]": 20,
      },
      tags: ["sections"],
    });
    const sections = deserialize(doc).map(normalizeSection);
    return sections.length ? sections : DEFAULT_SECTIONS;
  } catch {
    // Content type not created yet — fall back so the storefront still works.
    return DEFAULT_SECTIONS;
  }
}
