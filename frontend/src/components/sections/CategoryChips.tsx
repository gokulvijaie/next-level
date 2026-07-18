import Link from "next/link";
import type { Category } from "@/lib/services/taxonomy";

/** Horizontally scroll-snapped category pills, app-style. */
export function CategoryChips({ categories, active }: { categories: Category[]; active?: string }) {
  if (!categories.length) return null;
  return (
    <nav aria-label="Product categories" className="-mx-4 px-4">
      <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto py-3">
        <Chip href="/shop" label="All" isActive={!active} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            href={`/shop?category=${encodeURIComponent(category.slug)}`}
            label={category.name}
            isActive={active === category.slug}
          />
        ))}
      </div>
    </nav>
  );
}

function Chip({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={
        "snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-extrabold shadow-card transition-colors " +
        (isActive
          ? "bg-brand text-brand-foreground"
          : "bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground")
      }
    >
      {label}
    </Link>
  );
}
