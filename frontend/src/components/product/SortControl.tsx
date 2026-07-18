"use client";

/**
 * Product sorting UI.
 *
 * ProductSortControl renders a bottom sheet on mobile (MobileSortSheet)
 * and a native select on md+ (DesktopSortSelect). Both write ONLY the
 * `sort` URL query parameter — every other parameter (category, filter,
 * search, page… except page, which resets to 1) is preserved, so sorting
 * and filtering compose. State lives entirely in the URL: refresh and
 * back/forward navigation keep the selection, and mobile/desktop share
 * the exact same logic and keys.
 */
import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ArrowUpDown, Check, Loader2 } from "lucide-react";
import { EASE, useMotionPrefs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { DEFAULT_SORT, SORT_OPTIONS, isValidSort } from "@/lib/sort";

function useSortNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const current = isValidSort(params.get("sort") ?? undefined)
    ? (params.get("sort") as string)
    : DEFAULT_SORT;

  const apply = React.useCallback(
    (key: string) => {
      const next = new URLSearchParams(params.toString());
      if (key === DEFAULT_SORT) next.delete("sort");
      else next.set("sort", key);
      next.delete("page"); // a new order restarts pagination
      startTransition(() => {
        // scroll: false preserves the shopper's position in the list.
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  return { current, apply, isPending };
}

export function ProductSortControl() {
  return (
    <React.Suspense fallback={<div className="h-11 w-28 rounded-full bg-muted" />}>
      <div className="md:hidden">
        <MobileSortSheet />
      </div>
      <div className="hidden md:block">
        <DesktopSortSelect />
      </div>
    </React.Suspense>
  );
}

export function DesktopSortSelect() {
  const { current, apply, isPending } = useSortNavigation();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      Sort by
      <span className="relative inline-flex items-center">
        <select
          value={current}
          onChange={(event) => apply(event.target.value)}
          className="h-11 rounded-full border border-input bg-card px-4 pr-9 text-sm font-semibold shadow-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        )}
      </span>
    </label>
  );
}

export function MobileSortSheet() {
  const { current, apply, isPending } = useSortNavigation();
  const prefs = useMotionPrefs();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const currentLabel = SORT_OPTIONS.find((o) => o.key === current)?.label ?? "Sort";

  // Focus management + Escape + scroll lock while open.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    sheetRef.current
      ?.querySelector<HTMLElement>("[aria-checked='true']")
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      (previous ?? trigger)?.focus();
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) setOpen(false);
  };

  const select = (key: string) => {
    apply(key);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-semibold shadow-inset active:scale-95"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowUpDown className="h-4 w-4" aria-hidden />
        )}
        <span className="max-w-32 truncate">{currentLabel}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close sorting options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefs.reduced ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/55"
            />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Sort products"
              initial={prefs.reduced ? { opacity: 0 } : { y: "100%" }}
              animate={prefs.reduced ? { opacity: 1 } : { y: 0 }}
              exit={prefs.reduced ? { opacity: 0 } : { y: "100%" }}
              transition={{ duration: prefs.reduced ? 0 : 0.28, ease: EASE }}
              drag={prefs.reduced ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={onDragEnd}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-card-hover"
            >
              {/* Grab handle */}
              <div className="sticky top-0 grid place-items-center bg-card pb-1 pt-3" aria-hidden>
                <span className="h-1.5 w-10 rounded-full bg-border" />
              </div>
              <h2 className="px-5 pb-2 text-lg font-extrabold">Sort by</h2>

              <div role="radiogroup" aria-label="Sort order" className="px-2 pb-4">
                {SORT_OPTIONS.map((option) => {
                  const selected = option.key === current;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => select(option.key)}
                      className={cn(
                        "flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-medium active:scale-[0.99]",
                        selected ? "bg-brand font-bold text-brand-foreground" : "hover:bg-secondary",
                      )}
                    >
                      {option.label}
                      {selected && <Check className="h-5 w-5" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
