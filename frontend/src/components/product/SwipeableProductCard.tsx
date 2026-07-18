"use client";

/**
 * A single draggable discovery card (used only inside SwipeableProductDeck).
 *
 * - `drag="x"` with Framer's automatic `touch-action: pan-y`, so horizontal
 *   card swipes never fight vertical page scrolling.
 * - Rotation and the SAVE / NEXT feedback overlays are driven directly from
 *   the drag offset via motion values — hardware-accelerated, no re-renders.
 * - A swipe only commits past a distance OR velocity threshold; otherwise
 *   the card springs back (`dragSnapToOrigin`), preventing accidental
 *   actions.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Heart, X } from "lucide-react";
import { AnimatedPriceRow } from "@/components/product/AnimatedPrice";
import { Badge } from "@/components/ui/badge";
import { EASE, type MotionPrefs } from "@/lib/motion";
import { productBadge, type Product } from "@/types/product";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";

export const SWIPE_DISTANCE = 96;
export const SWIPE_VELOCITY = 600;

export type SwipeDirection = "left" | "right";

type Props = {
  product: Product;
  onSwipe: (direction: SwipeDirection) => void;
  prefs: MotionPrefs;
  /** Only the top card is interactive. */
  topmost: boolean;
};

export function SwipeableProductCard({ product, onSwipe, prefs, topmost }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], prefs.reduced ? [0, 0] : [-9, 9]);
  const saveOpacity = useTransform(x, [32, SWIPE_DISTANCE], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_DISTANCE, -32], [1, 0]);
  const badge = productBadge(product);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) {
      onSwipe("right");
    } else if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) {
      onSwipe("left");
    }
    // Below threshold: dragSnapToOrigin springs the card back.
  };

  return (
    <motion.div
      drag={topmost ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      whileDrag={{ cursor: "grabbing" }}
      className="absolute inset-0 touch-pan-y select-none overflow-hidden rounded-lg bg-card shadow-card-hover"
    >
      <div className="relative h-3/5 bg-muted">
        {badge && (
          <span className="absolute left-3 top-3 z-10">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>
        )}
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes="(max-width: 640px) 90vw, 24rem"
            className="pointer-events-none object-contain p-3"
            draggable={false}
          />
        ) : (
          <ProductImagePlaceholder />
        )}

        {/* Drag feedback overlays — opacity keyed to drag distance. */}
        <motion.div
          style={{ opacity: saveOpacity }}
          aria-hidden
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 -rotate-12 rounded-md border-4 border-success bg-background/85 px-3 py-1 text-xl font-extrabold text-success"
        >
          <Heart className="mr-1 inline h-5 w-5 fill-current" /> SAVE
        </motion.div>
        <motion.div
          style={{ opacity: skipOpacity }}
          aria-hidden
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rotate-12 rounded-md border-4 border-muted-foreground bg-background/85 px-3 py-1 text-xl font-extrabold text-muted-foreground"
        >
          <X className="mr-1 inline h-5 w-5" /> NEXT
        </motion.div>
      </div>

      <div className="flex h-2/5 flex-col gap-1 p-4">
        {product.category && (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {product.category.name}
          </p>
        )}
        <h3 className="line-clamp-2 text-lg font-bold leading-6">{product.title}</h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <AnimatedPriceRow product={product} large />
          <Link
            href={product.path}
            draggable={false}
            className="whitespace-nowrap text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Details
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/** Exit animation for a committed swipe — flies off in the swiped direction. */
export function deckExit(direction: SwipeDirection, prefs: MotionPrefs) {
  return {
    x: direction === "right" ? 480 : -480,
    opacity: 0,
    rotate: prefs.reduced ? 0 : direction === "right" ? 14 : -14,
    transition: { duration: prefs.reduced ? 0 : 0.3, ease: EASE },
  };
}
