"use client";

/**
 * AnimatedWishlistButton — heart toggle with a spring pop and a radiating
 * ring burst when a product is saved. `aria-pressed` + live announcements.
 *
 * AnimatedAddToCartButton — tap feedback plus a success morph: the label
 * swaps to "Added ✓" on a green surface for ~1.6s, announced politely to
 * screen readers. Transform/opacity only; button size never changes.
 *
 * All targets are at least 44×44px. On `prefers-reduced-motion`, feedback
 * still happens (color/label changes) but without movement.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, ShoppingCart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { EASE, useMotionPrefs } from "@/lib/motion";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

export function AnimatedWishlistButton({
  product,
  showLabel = false,
  className,
}: {
  product: Product;
  showLabel?: boolean;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const prefs = useMotionPrefs();
  const active = has(product.id);
  // Incrementing key re-triggers the pop + ring burst on every save.
  const [burst, setBurst] = React.useState(0);
  const [announcement, setAnnouncement] = React.useState("");

  const handleClick = () => {
    if (!active) setBurst((b) => b + 1);
    toggle(product);
    setAnnouncement(
      active ? `${product.title} removed from wishlist` : `${product.title} saved to wishlist`,
    );
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={prefs.reduced ? undefined : { scale: 0.88 }}
      transition={{ duration: 0.15, ease: EASE }}
      aria-pressed={active}
      aria-label={
        active ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`
      }
      className={cn(
        showLabel
          ? buttonVariants({ variant: "outline", size: "lg" })
          : "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-input bg-card/95 backdrop-blur transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        active && "border-destructive text-destructive",
        className,
      )}
    >
      <motion.span
        key={burst}
        animate={active && !prefs.reduced ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="inline-flex"
      >
        <Heart className={cn("h-5 w-5", active && "fill-current")} aria-hidden />
      </motion.span>
      {showLabel && <span>{active ? "Saved" : "Save"}</span>}

      {/* Radiating ring burst on save. */}
      <AnimatePresence>
        {burst > 0 && active && !prefs.reduced && (
          <motion.span
            key={`ring-${burst}`}
            aria-hidden
            initial={{ opacity: 0.6, scale: 0.7 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-destructive"
          />
        )}
      </AnimatePresence>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </motion.button>
  );
}

export function AnimatedAddToCartButton({
  product,
  quantity = 1,
  size = "default",
  className,
  iconOnly = false,
}: {
  product: Product;
  quantity?: number;
  size?: "default" | "lg";
  className?: string;
  /** Compact circular black "+" button (product-card style). */
  iconOnly?: boolean;
}) {
  const { addItem } = useCart();
  const prefs = useMotionPrefs();
  const [added, setAdded] = React.useState(false);
  const timer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleClick = () => {
    if (added) return;
    addItem(product, quantity);
    setAdded(true);
    timer.current = window.setTimeout(() => setAdded(false), 1600);
  };

  const swap = {
    initial: { y: prefs.reduced ? 0 : 14, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: prefs.reduced ? 0 : -14, opacity: 0 },
    transition: { duration: prefs.reduced ? 0 : 0.22, ease: EASE },
  } as const;

  if (iconOnly) {
    return (
      <>
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={!product.inStock}
          whileTap={prefs.reduced || !product.inStock ? undefined : { scale: 0.88 }}
          animate={added && !prefs.reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.3, ease: EASE }}
          aria-label={`Add ${product.title} to cart`}
          className={cn(
            "grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40",
            added && "bg-success",
            className,
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {added ? (
              <motion.span key="added" {...swap} className="inline-flex">
                <Check className="h-5 w-5" aria-hidden />
              </motion.span>
            ) : (
              <motion.span key="idle" {...swap} className="inline-flex text-lg font-bold leading-none">
                +
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <span aria-live="polite" className="sr-only">
          {added ? `${product.title} added to cart` : ""}
        </span>
      </>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={!product.inStock}
        whileTap={prefs.reduced || !product.inStock ? undefined : { scale: 0.96 }}
        animate={added && !prefs.reduced ? { scale: [1, 1.04, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
        aria-label={`Add ${product.title} to cart`}
        className={cn(
          buttonVariants({ size }),
          "overflow-hidden",
          added && "bg-success hover:bg-success",
          className,
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!product.inStock ? (
            <span key="oos">Out of stock</span>
          ) : added ? (
            <motion.span key="added" {...swap} className="inline-flex items-center gap-2">
              <Check className="h-4 w-4" aria-hidden />
              Added
            </motion.span>
          ) : (
            <motion.span key="idle" {...swap} className="inline-flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" aria-hidden />
              Add to cart
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      <span aria-live="polite" className="sr-only">
        {added ? `${product.title} added to cart` : ""}
      </span>
    </>
  );
}
