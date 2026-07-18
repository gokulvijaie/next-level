/** Normalized product shape used by every UI component. */
export type Product = {
  id: string;
  /** Drupal internal numeric ID (used for cart operations). */
  productId: number | null;
  variationId: number | null;
  title: string;
  /** Storefront path, e.g. /product/blue-shirt. */
  path: string;
  image: { url: string; alt: string; width?: number; height?: number } | null;
  price: number | null;
  listPrice: number | null;
  currency: string;
  discountPercent: number | null;
  category: { id: string; name: string; slug: string } | null;
  rating: number | null;
  reviewCount: number | null;
  inStock: boolean;
  isNew: boolean;
  isFeatured: boolean;
  createdAt: string;
  body: string | null;
  /** Price is exactly zero — rendered as a "Free" label. */
  isFree: boolean;
  /** Variations have different prices — price is the minimum ("From …"). */
  startingFrom: boolean;
  /** Pre-formatted stat labels (null = hidden by admin config or zero). */
  purchaseLabel: string | null;
  downloadLabel: string | null;
};

export type ProductBadge = {
  label: string;
  tone: "sale" | "new" | "featured" | "out-of-stock";
};

export function productBadge(p: Product): ProductBadge | null {
  if (!p.inStock) return { label: "Out of stock", tone: "out-of-stock" };
  if (p.discountPercent) return { label: "Sale", tone: "sale" };
  if (p.isFeatured) return { label: "Featured", tone: "featured" };
  if (p.isNew) return { label: "New", tone: "new" };
  return null;
}

/** 120 -> "120", 763 -> "500+", 1900 -> "1K+" — honest bucketing, never inflating. */
export function bucketCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  if (n >= 500) return "500+";
  if (n >= 100) return `${Math.floor(n / 100) * 100}+`;
  return String(n);
}

export function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
}
