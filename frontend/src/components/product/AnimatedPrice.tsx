"use client";

/**
 * Price and stock-status displays that animate when their VALUE changes
 * (e.g. a revalidation delivers a new price, or a variation is switched).
 * Keyed AnimatePresence slides the old value out and the new one in —
 * transform/opacity only, no layout shift (the row keeps its height).
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { EASE, useMotionPrefs } from "@/lib/motion";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

export function AnimatedPriceRow({ product, large = false }: { product: Product; large?: boolean }) {
  const prefs = useMotionPrefs();
  const { format } = useCurrency();
  // Prices convert to the shopper's selected display currency using
  // server-provided rates; free products show a label instead of 0.00.
  const price = product.isFree ? "Free" : format(product.price, product.currency);
  const transition = { duration: prefs.reduced ? 0 : 0.25, ease: EASE };

  return (
    <div className="flex flex-wrap items-baseline gap-2 overflow-hidden">
      {product.startingFrom && !product.isFree && (
        <span className="text-xs text-muted-foreground">From</span>
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={price}
          initial={{ opacity: 0, y: prefs.reduced ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefs.reduced ? 0 : -10 }}
          transition={transition}
          className={cn(
            "font-bold",
            large ? "text-2xl" : "text-[0.9375rem] min-[380px]:text-base",
            product.listPrice && "text-destructive",
            product.isFree && "text-success",
          )}
        >
          {price}
        </motion.span>
      </AnimatePresence>

      {product.listPrice && (
        <>
          <s className="text-xs text-muted-foreground">
            <span className="sr-only">Original price:</span>
            {format(product.listPrice, product.currency)}
          </s>
          <motion.span
            initial={prefs.reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...transition, delay: prefs.reduced ? 0 : 0.1 }}
            className="text-xs font-bold text-success"
          >
            -{product.discountPercent}%
          </motion.span>
        </>
      )}
    </div>
  );
}

export function AnimatedStock({ inStock, className }: { inStock: boolean; className?: string }) {
  const prefs = useMotionPrefs();
  return (
    <div className={cn("overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={inStock ? "in" : "out"}
          initial={{ opacity: 0, y: prefs.reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: prefs.reduced ? 0 : -8 }}
          transition={{ duration: prefs.reduced ? 0 : 0.25, ease: EASE }}
          className={cn("text-xs", inStock ? "text-success" : "text-destructive")}
        >
          {inStock ? "In stock" : "Out of stock"}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
