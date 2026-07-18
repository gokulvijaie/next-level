"use client";

/**
 * Responsive product grid (1/2/3/4/5 columns) with orchestrated motion:
 * - staggered viewport entrances (via each card's own `whileInView`),
 * - smooth exit + FLIP reorder when products are added, removed, filtered
 *   or sorted (AnimatePresence + `layout` — the component stays mounted
 *   across searchParam changes, so prop updates animate in place).
 * Layout animations are disabled under reduced motion and on lite devices,
 * where they'd cost more than they're worth.
 */
import { AnimatePresence, motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { AnimatedProductCard } from "@/components/product/AnimatedProductCard";
import { EASE, useMotionPrefs } from "@/lib/motion";
import type { Product } from "@/types/product";

export function AnimatedProductGrid({ products }: { products: Product[] }) {
  const prefs = useMotionPrefs();

  if (!products.length) {
    return (
      <motion.div
        initial={prefs.reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="soft-panel grid place-items-center gap-3 px-4 py-16 text-center"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-brand-foreground" aria-hidden>
          <SearchX className="h-7 w-7" />
        </span>
        <h2 className="text-lg font-bold">No products found</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Try removing some filters or searching for something else.
        </p>
      </motion.div>
    );
  }

  const animateLayout = !prefs.reduced && !prefs.lite;

  return (
    // Mobile-first: 2-up from 340px (1-up only on very narrow screens),
    // 3 on tablet, 4–5 on desktop. Tight mobile gutters per the reference.
    <ul className="grid list-none grid-cols-1 gap-3 p-0 min-[340px]:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      <AnimatePresence mode="popLayout" initial={false}>
        {products.map((product, index) => (
          <motion.li
            key={product.id}
            layout={animateLayout}
            exit={
              prefs.reduced
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: EASE } }
            }
            transition={{ duration: 0.3, ease: EASE }}
            className="min-w-0"
          >
            <AnimatedProductCard product={product} index={index} priority={index < 4} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
