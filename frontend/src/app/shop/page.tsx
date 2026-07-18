/**
 * Catalogue page.
 *
 * The complete listing state — sort, category, deal filter, search query,
 * page — lives in URL query parameters (?sort=price_asc&category=book…),
 * so refresh, share links and back/forward all work, and mobile/desktop
 * share identical logic. Sorting, filtering and pagination are executed
 * server-side by Drupal's catalog endpoint (raw numeric prices, integer
 * dates, stat aggregates) — never by sorting formatted strings in the
 * browser, and display-currency conversion cannot affect the order.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCatalogProducts } from "@/lib/services/products";
import { getCategories } from "@/lib/services/taxonomy";
import { ProductGrid } from "@/components/product/ProductGrid";
import { CategoryChips } from "@/components/sections/CategoryChips";
import { ProductFilterDrawer } from "@/components/product/ProductFilterDrawer";
import { ProductSortControl } from "@/components/product/SortControl";
import { DEFAULT_SORT, isValidSort } from "@/lib/sort";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Shop" };

const PAGE_SIZE = 24;

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;
  const filter = typeof params.filter === "string" ? params.filter : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;
  // Validate the sort BEFORE it reaches the backend; unknown → default.
  const sort =
    typeof params.sort === "string" && isValidSort(params.sort) ? params.sort : DEFAULT_SORT;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ products, total }, categories] = await Promise.all([
    getCatalogProducts({
      sort,
      q,
      category,
      onSale: filter === "sale",
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getCategories(),
  ]);

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { category, filter, q, sort, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "sort" && value === DEFAULT_SORT)) next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const activeChips = [
    category && { label: category, href: buildHref({ category: undefined, page: undefined }) },
    filter === "sale" && { label: "On sale", href: buildHref({ filter: undefined, page: undefined }) },
    q && { label: `"${q}"`, href: buildHref({ q: undefined, page: undefined }) },
  ].filter((chip): chip is { label: string; href: string } => Boolean(chip));

  return (
    <div className="container py-4 md:py-6">
      <div className="theme-panel mb-4 flex min-h-32 items-end overflow-hidden p-6 md:min-h-40 md:p-8">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-primary-foreground">
            Catalog
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            {q ? `Results for "${q}"` : (category ?? "Shop")}
          </h1>
        </div>
      </div>

      <CategoryChips categories={categories} active={category} />

      {/* Toolbar: count + filters + sort (sheet on mobile, select on desktop). */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-card px-3 py-2 shadow-card sm:rounded-full">
        <p className="pl-2 text-sm font-semibold text-muted-foreground" aria-live="polite">
          {total} product{total === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2 max-[380px]:w-full max-[380px]:justify-between">
          <ProductFilterDrawer
            categories={categories}
            active={{ category, onSale: filter === "sale" }}
            buildHref={{
              base: buildHref({ page: undefined }),
              clear: "/shop",
            }}
          />
          <ProductSortControl />
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border bg-secondary px-3 text-sm font-semibold hover:border-destructive hover:text-destructive"
            >
              {chip.label} <span aria-hidden>×</span>
              <span className="sr-only">(remove filter)</span>
            </Link>
          ))}
          <Link href="/shop" className="text-sm font-semibold text-destructive underline">
            Clear all
          </Link>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        {/* Desktop sidebar filters (links preserve sort + search). */}
        <aside className="hidden lg:block" aria-label="Product filters">
          <FilterLinks
            categories={categories}
            category={category}
            filter={filter}
            buildHref={buildHref}
          />
        </aside>
        <div>
          <ProductGrid products={products} />
          <Pagination page={page} total={total} buildHref={buildHref} />
        </div>
      </div>
    </div>
  );
}

function FilterLinks({
  categories,
  category,
  filter,
  buildHref,
}: {
  categories: { id: string; name: string; slug: string }[];
  category?: string;
  filter?: string;
  buildHref: (o: Record<string, string | undefined>) => string;
}) {
  return (
    <div className="soft-panel grid gap-4 p-4">
      <details open className="border-b pb-3">
        <summary className="cursor-pointer list-none py-2 font-bold">Category</summary>
        <div className="grid gap-1">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={buildHref({
                category: c.slug === category ? undefined : c.slug,
                page: undefined,
              })}
              aria-pressed={c.slug === category}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm hover:bg-secondary",
                c.slug === category && "bg-brand font-bold text-brand-foreground",
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </details>
      <details open className="border-b pb-3">
        <summary className="cursor-pointer list-none py-2 font-bold">Deals</summary>
        <Link
          href={buildHref({ filter: filter === "sale" ? undefined : "sale", page: undefined })}
          aria-pressed={filter === "sale"}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm hover:bg-secondary",
            filter === "sale" && "bg-brand font-bold text-brand-foreground",
          )}
        >
          On sale
        </Link>
      </details>
    </div>
  );
}

function Pagination({
  page,
  total,
  buildHref,
}: {
  page: number;
  total: number;
  buildHref: (o: Record<string, string | undefined>) => string;
}) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center gap-2">
      {page > 1 && (
        <Link
          href={buildHref({ page: page - 1 === 1 ? undefined : String(page - 1) })}
          className={buttonVariants({ variant: "outline" })}
        >
          Previous
        </Link>
      )}
      <span className="inline-flex h-11 items-center px-3 text-sm text-muted-foreground">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link href={buildHref({ page: String(page + 1) })} className={buttonVariants({ variant: "outline" })}>
          Next
        </Link>
      )}
    </nav>
  );
}
