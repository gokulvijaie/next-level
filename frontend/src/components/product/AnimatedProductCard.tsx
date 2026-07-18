"use client";

/**
 * Premium animated product card.
 *
 * Entrance: fade + rise + subtle scale, triggered once when the card enters
 * the viewport (`whileInView`, `once: true`), staggered by grid position.
 * Desktop: Framer-driven hover lift (-4px) with a CSS shadow transition and
 * image zoom; actions fade in on hover/focus. Mobile: no hover dependency —
 * actions are always visible, buttons give tap feedback (`whileTap`).
 * Everything animates transform/opacity only; the 4/5 image box and 2-line
 * title clamp prevent layout shift. Respects reduced-motion and lite mode.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AnimatedWishlistButton, AnimatedAddToCartButton } from "@/components/product/AnimatedButtons";
import { AnimatedPriceRow, AnimatedStock } from "@/components/product/AnimatedPrice";
import { EASE, fadeUpVariants, useMotionPrefs, VIEWPORT_ONCE } from "@/lib/motion";
import { productBadge, type Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";

type Props = {
  product: Product;
  /** Position in its grid/slider — drives the stagger delay. */
  index?: number;
  priority?: boolean;
};

export function AnimatedProductCard({ product, index = 0, priority = false }: Props) {
  const prefs = useMotionPrefs();
  const badge = productBadge(product);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  return (
    <motion.article
      variants={fadeUpVariants(prefs, index)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      whileHover={prefs.hoverable && !prefs.reduced ? { y: -4 } : undefined}
      transition={{ duration: 0.2, ease: EASE }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-brand text-brand-foreground shadow-card transition-shadow duration-200 hover:shadow-card-hover focus-within:shadow-card-hover"
    >
      {/* Media — white inset panel on the yellow card, per the reference. */}
      <div className="relative m-2 mb-0 aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-white shadow-inset">
        {badge && (
          <motion.span
            initial={prefs.reduced ? false : { opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: prefs.reduced ? 0 : 0.15 }}
            className="absolute left-2 top-2 z-10"
          >
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </motion.span>
        )}

        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes="(max-width: 480px) 80vw, (max-width: 768px) 45vw, (max-width: 1280px) 30vw, 20vw"
            priority={priority}
            onLoad={() => setImageLoaded(true)}
            className={cn(
              // Smooth image reveal on load + hover zoom; the aspect box
              // reserves space so there is zero layout shift.
              "object-contain p-3 transition-[opacity,transform] duration-300 ease-out",
              prefs.hoverable && "group-hover:scale-[1.04]",
              imageLoaded || priority ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <ProductImagePlaceholder className="bg-white" />
        )}

        {/* Floating actions: hover-revealed on desktop, always visible on touch. */}
        <div
          className={cn(
            "absolute right-2 top-2 z-10 flex flex-col gap-1",
            prefs.hoverable &&
              "translate-y-1 opacity-0 transition-all duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100",
          )}
        >
          <AnimatedWishlistButton product={product} />
          <QuickView product={product} />
        </div>
      </div>

      {/* Body — black text on brand yellow. */}
      <div className="flex flex-1 flex-col gap-0.5 p-4 pt-3">
        {product.category && (
          <p className="text-[0.6875rem] font-extrabold uppercase tracking-wide opacity-70">
            {product.category.name}
          </p>
        )}
        <h3 className="min-h-11 overflow-hidden break-words text-base font-extrabold leading-[1.15] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [display:-webkit-box]">
          <Link href={product.path} className="after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>

        {product.rating !== null && <Rating product={product} />}
        <AnimatedStock inStock={product.inStock} />
        {/* Real, admin-gated statistics from Drupal — never invented. */}
        {(product.purchaseLabel || product.downloadLabel) && (
          <p className="text-[0.6875rem] opacity-70">
            {[product.purchaseLabel, product.downloadLabel].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Footer row: price left, circular black "+" right (reference style). */}
        <div className="relative z-10 mt-auto flex items-end justify-between gap-2 pt-1.5">
          <AnimatedPriceRow product={product} />
          <AnimatedAddToCartButton product={product} iconOnly className="shrink-0" />
        </div>
      </div>
    </motion.article>
  );
}

function Rating({ product }: { product: Product }) {
  return (
    <div
      className="flex items-center gap-1 text-xs font-semibold text-black/65"
      role="img"
      aria-label={`Rated ${product.rating} out of 5 stars${
        product.reviewCount ? `, ${product.reviewCount} reviews` : ""
      }`}
    >
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            className={cn(
              "h-3.5 w-3.5",
              i <= Math.round(product.rating ?? 0)
                ? "fill-amber-500 text-amber-500"
                : "fill-none text-border",
            )}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
          </svg>
        ))}
      </span>
      {product.reviewCount !== null && <span aria-hidden>({product.reviewCount})</span>}
    </div>
  );
}

function QuickView({ product }: { product: Product }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Quick view of ${product.title}`}
          className="border-0 bg-card/95 shadow-card backdrop-blur"
        >
          <Eye className="h-5 w-5" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-brand">
            {product.image && (
              <Image
                src={product.image.url}
                alt={product.image.alt}
                fill
                sizes="(max-width: 768px) 90vw, 28rem"
                className="object-contain p-6"
              />
            )}
          </div>
          <div className="flex flex-col gap-3">
            {product.category && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {product.category.name}
              </p>
            )}
            <DialogTitle className="text-xl font-bold">{product.title}</DialogTitle>
            <AnimatedPriceRow product={product} large />
            <AnimatedAddToCartButton product={product} />
            <Link
              href={product.path}
              className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              View full details
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
