/**
 * A homepage/landing section as defined by a Drupal "section" node.
 * The frontend has NO hard-coded homepage layout: editors create, order
 * and configure section nodes in Drupal and the SectionRenderer maps each
 * one to a React component by `kind`.
 */
export type SectionKind =
  | "carousel"
  | "banner"
  | "grid"
  | "chips"
  | "recently_viewed"
  | "discover";

export type Section = {
  id: string;
  kind: SectionKind;
  title: string;
  weight: number;
  /** Product query configuration (carousel/grid sections). */
  query: {
    sort?: string;
    categorySlug?: string;
    featured?: boolean;
    onSale?: boolean;
    limit?: number;
    /** Stat-driven collection (best_sellers, highest_rated, ...). */
    collection?: import("@/types/storefront").CollectionKey;
  };
  /** Automatic carousel movement (admin-controlled; carousels only). */
  autoplay?: boolean;
  /** "View all" target. */
  link?: { href: string; label: string } | null;
  /** Banner sections. */
  banner?: {
    eyebrow?: string;
    text?: string;
    image?: string | null;
    href?: string;
    cta?: string;
  } | null;
};
