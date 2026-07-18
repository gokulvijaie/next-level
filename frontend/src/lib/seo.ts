/** Product structured data (schema.org) for rich results. */
import type { Product } from "@/types/product";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image ? [product.image.url] : undefined,
    description: product.body?.replace(/<[^>]+>/g, "").slice(0, 300),
    url: `${SITE_URL}${product.path}`,
    ...(product.rating && product.reviewCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: product.price ?? undefined,
      priceCurrency: product.currency,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}${product.path}`,
    },
  };
}
