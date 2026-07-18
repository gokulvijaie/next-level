/**
 * Sort options — shared by the server page (validation), the client sort
 * controls, and mirrored by the Drupal catalog endpoint's whitelist.
 * Plain module (no "use client") so both worlds can import it.
 */
export const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "rating_desc", label: "Highest rated" },
  { key: "reviews_desc", label: "Most reviewed" },
  { key: "purchases_desc", label: "Most purchased" },
  { key: "downloads_desc", label: "Most downloaded" },
  { key: "popular", label: "Most popular" },
  { key: "title_asc", label: "Name: A to Z" },
  { key: "title_desc", label: "Name: Z to A" },
];

export const DEFAULT_SORT = "relevance";

export function isValidSort(value: string | undefined): value is string {
  return Boolean(value && SORT_OPTIONS.some((o) => o.key === value));
}
