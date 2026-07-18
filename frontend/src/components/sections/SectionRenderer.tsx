/**
 * Server component that turns Drupal "section" entities into UI.
 * The homepage layout is 100% data-driven: add/reorder/remove section
 * nodes in Drupal and the storefront follows on the next revalidation —
 * no code deploys, no hard-coded layouts.
 */
import { getCollectionProducts, getProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/taxonomy";
import type { Section } from "@/types/section";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SwipeableProductDeck } from "@/components/product/ProductDeck";
import { HeroBanner } from "@/components/sections/HeroBanner";
import { CategoryChips } from "@/components/sections/CategoryChips";
import { RecentlyViewed } from "@/components/sections/RecentlyViewed";

export async function SectionRenderer({ section }: { section: Section }) {
  switch (section.kind) {
    case "banner":
      return <HeroBanner title={section.title} banner={section.banner} />;

    case "chips": {
      const categories = await getCategories();
      return <CategoryChips categories={categories} />;
    }

    case "recently_viewed":
      return <RecentlyViewed title={section.title} />;

    case "discover": {
      // Card-by-card swipe deck — used only for discovery-style sections.
      const products = await safeProducts({ ...section.query, limit: section.query.limit ?? 12 });
      if (!products.length) return null;
      return <SwipeableProductDeck title={section.title} products={products} />;
    }

    case "grid": {
      const products = await safeProducts({ ...section.query, limit: section.query.limit ?? 12 });
      return (
        <section className="my-8" aria-label={section.title}>
          <h2 className="mb-4 text-xl font-extrabold tracking-tight">{section.title}</h2>
          <ProductGrid products={products} />
        </section>
      );
    }

    case "carousel":
    default: {
      const products = await sectionProducts(section);
      if (!products.length) return null;
      return (
        <ProductCarousel
          title={section.title}
          products={products}
          viewAllHref={section.link?.href}
          viewAllLabel={section.link?.label}
          autoplay={section.autoplay}
        />
      );
    }
  }
}

/** Collection-driven sections (best sellers, top rated, …) vs. field queries. */
async function sectionProducts(section: Section) {
  const limit = section.query.limit ?? 10;
  if (section.query.collection) {
    try {
      return await getCollectionProducts(section.query.collection, limit);
    } catch {
      return [];
    }
  }
  return safeProducts({ ...section.query, limit });
}

/**
 * A section must never take the whole page down — if the backend is
 * unreachable (build server, backend deploy window) render nothing and
 * let revalidation restore it.
 */
async function safeProducts(query: Parameters<typeof getProducts>[0]) {
  try {
    return (await getProducts(query)).products;
  } catch {
    return [];
  }
}
