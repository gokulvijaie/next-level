"use client";

/**
 * Mobile filter drawer (bottom sheet, matching MobileSortSheet). Filter
 * links preserve the current sort and search — filtering and sorting
 * never reset each other. Hidden on lg+ where the sidebar shows.
 */
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
import { EASE, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/services/taxonomy";

type Props = {
  categories: Category[];
  active: { category?: string; onSale: boolean };
  buildHref: { base: string; clear: string };
};

export function ProductFilterDrawer(props: Props) {
  return (
    <React.Suspense fallback={<div className="h-11 w-24 rounded-full bg-muted lg:hidden" />}>
      <FilterDrawerInner {...props} />
    </React.Suspense>
  );
}

function FilterDrawerInner({ categories, active }: Props) {
  const prefs = useMotionPrefs();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  // Build hrefs that keep every current param except the one being toggled.
  const href = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) setOpen(false);
  };

  const count = (active.category ? 1 : 0) + (active.onSale ? 1 : 0);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-semibold shadow-inset active:scale-95"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filters
        {count > 0 && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close filters"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefs.reduced ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/55"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filter products"
              initial={prefs.reduced ? { opacity: 0 } : { y: "100%" }}
              animate={prefs.reduced ? { opacity: 1 } : { y: 0 }}
              exit={prefs.reduced ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: prefs.reduced ? 0 : 0.28, ease: EASE }}
              drag={prefs.reduced ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-card pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-card-hover"
            >
              <div className="sticky top-0 grid place-items-center bg-card pb-1 pt-3" aria-hidden>
                <span className="h-1.5 w-10 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2">
                <h2 className="text-lg font-extrabold">Filters</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close filters"
                  className="grid h-11 w-11 place-items-center rounded-full hover:bg-secondary"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="px-5">
                <h3 className="py-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const selected = c.slug === active.category;
                    return (
                      <Link
                        key={c.id}
                        href={href({ category: selected ? undefined : c.slug })}
                        onClick={() => setOpen(false)}
                        aria-pressed={selected}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold",
                          selected
                            ? "bg-brand text-brand-foreground"
                            : "bg-secondary hover:bg-border",
                        )}
                      >
                        {c.name}
                      </Link>
                    );
                  })}
                </div>

                <h3 className="py-2 pt-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Deals
                </h3>
                <Link
                  href={href({ filter: active.onSale ? undefined : "sale" })}
                  onClick={() => setOpen(false)}
                  aria-pressed={active.onSale}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold",
                    active.onSale ? "bg-brand text-brand-foreground" : "bg-secondary hover:bg-border",
                  )}
                >
                  On sale
                </Link>

                {count > 0 && (
                  <div className="pt-4">
                    <Link
                      href={href({ category: undefined, filter: undefined, q: undefined })}
                      onClick={() => setOpen(false)}
                      className="text-sm font-semibold text-destructive underline"
                    >
                      Clear all filters
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
