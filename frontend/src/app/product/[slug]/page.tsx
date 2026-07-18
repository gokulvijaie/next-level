/**
 * Product detail page. Statically generated per product with ISR;
 * invalidated by tag when the product changes in Drupal. Full SEO:
 * generateMetadata + schema.org Product JSON-LD.
 */
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getAllProductPaths,
  getProductByPath,
  getRelatedProducts,
} from "@/lib/services/products";
import { getReviews, getStats } from "@/lib/services/storefront";
import { Reviews } from "@/components/reviews/Reviews";
import { productBadge } from "@/types/product";
import { AnimatedPriceRow } from "@/components/product/AnimatedPrice";
import { productJsonLd } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { RecentlyViewed, RecordProductView } from "@/components/sections/RecentlyViewed";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";
import { ProductActions, StickyPurchaseBar } from "./product-actions";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  try {
    const paths = await getAllProductPaths();
    return paths
      .filter((p) => p.startsWith("/product/"))
      .map((p) => ({ slug: p.replace("/product/", "") }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductByPath(`/product/${slug}`);
  if (!product) return {};
  const description = product.body?.replace(/<[^>]+>/g, "").slice(0, 160);
  return {
    title: product.title,
    description,
    alternates: { canonical: product.path },
    openGraph: {
      title: product.title,
      description,
      images: product.image ? [{ url: product.image.url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductByPath(`/product/${slug}`);
  if (!product) notFound();

  const [related, reviewsPayload, statsPayload] = await Promise.all([
    getRelatedProducts(product),
    getReviews(product.id),
    getStats(),
  ]);
  const badge = productBadge(product);

  return (
    <div className="container py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <RecordProductView product={product} />

      <div className="grid gap-6 md:grid-cols-2 md:gap-12">
        {/* Hero: brand-yellow rounded panel with large imagery (reference style). */}
        <div className="relative overflow-hidden rounded-[1.5rem] bg-brand p-3">
          {badge && (
            <Badge tone={badge.tone} className="absolute left-4 top-4 z-10">
              {badge.label}
            </Badge>
          )}
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-white">
            {product.image ? (
              <Image
                src={product.image.url}
                alt={product.image.alt}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-4 sm:p-6"
              />
            ) : (
              <ProductImagePlaceholder className="bg-white" />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {product.category && (
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {product.category.name}
            </p>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight [text-wrap:balance]">
            {product.title}
          </h1>

          {/* Client component: converts to the selected display currency. */}
          <AnimatedPriceRow product={product} large />
          {(product.purchaseLabel || product.downloadLabel) && (
            <p className="text-sm text-muted-foreground">
              {[product.purchaseLabel, product.downloadLabel].filter(Boolean).join(" · ")}
            </p>
          )}

          <p className={`text-sm font-semibold ${product.inStock ? "text-success" : "text-destructive"}`}>
            {product.inStock ? "In stock" : "Out of stock"}
          </p>

          {/* Quantity + add-to-cart + save; the mobile sticky bar keeps
              price and Buy Now in thumb reach while scrolling. */}
          <ProductActions product={product} />

          {product.body && (
            <section className="mt-4">
              <h2 className="mb-2 inline-flex rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-brand-foreground">
                Description
              </h2>
              <div
                className="prose prose-sm max-w-none text-foreground/90"
                dangerouslySetInnerHTML={{ __html: product.body }}
              />
            </section>
          )}
        </div>
      </div>

      <Reviews
        product={product}
        initialReviews={reviewsPayload.reviews}
        stats={statsPayload.stats[product.id] ?? null}
      />

      {related.length > 0 && (
        <ProductCarousel
          title="You may also like"
          products={related}
          viewAllHref={
            product.category ? `/shop?category=${encodeURIComponent(product.category.slug)}` : "/shop"
          }
        />
      )}

      <RecentlyViewed excludeId={product.id} />

      {/* Keep content clear of the sticky purchase bar + bottom nav. */}
      <div className="h-20 md:hidden" aria-hidden />
      <StickyPurchaseBar product={product} />
    </div>
  );
}
