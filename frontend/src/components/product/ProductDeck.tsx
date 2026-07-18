"use client";

/**
 * SwipeableProductDeck — a card-by-card discovery section ("Recommended
 * for you" / "Discover products"). Deliberately scoped: only sections with
 * kind "discover" render this; grids, categories and search stay normal.
 *
 * Gestures: swipe left = next product, swipe right = save to wishlist.
 * Accessible alternatives: visible Skip / Save / Undo buttons (≥44px),
 * arrow-key support, and polite live announcements of every action.
 */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/components/providers/WishlistProvider";
import {
  SwipeableProductCard,
  deckExit,
  type SwipeDirection,
} from "@/components/product/SwipeableProductCard";
import { EASE, useMotionPrefs, VIEWPORT_ONCE } from "@/lib/motion";
import type { Product } from "@/types/product";

export function SwipeableProductDeck({ title, products }: { title: string; products: Product[] }) {
  const prefs = useMotionPrefs();
  const { has, toggle } = useWishlist();
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState<SwipeDirection>("left");
  const [announcement, setAnnouncement] = React.useState("");

  const current = products[index];
  const upNext = products[index + 1];

  const act = React.useCallback(
    (dir: SwipeDirection) => {
      if (!current) return;
      setDirection(dir);
      if (dir === "right" && !has(current.id)) {
        toggle(current);
      }
      setAnnouncement(
        dir === "right" ? `${current.title} saved to wishlist` : `Skipped ${current.title}`,
      );
      setIndex((i) => i + 1);
    },
    [current, has, toggle],
  );

  const undo = () => {
    if (index === 0) return;
    const previous = products[index - 1];
    setDirection("left");
    setAnnouncement(`Back to ${previous.title}`);
    setIndex((i) => i - 1);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      act("left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      act("right");
    }
  };

  if (!products.length) return null;

  return (
    <motion.section
      initial={prefs.reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: prefs.reduced ? 0 : 0.4, ease: EASE }}
      className="my-8"
      aria-label={title}
    >
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {current && (
          <p className="text-sm font-semibold text-muted-foreground" aria-hidden>
            {index + 1} / {products.length}
          </p>
        )}
      </header>

      <div
        role="group"
        aria-label={`${title} — swipe right to save, swipe left to skip, or use the buttons below`}
        aria-roledescription="Swipeable product cards"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative mx-auto h-[26rem] w-full max-w-sm rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      >
        {/* Depth: the next card peeks from underneath. */}
        {upNext && (
          <motion.div
            key={`under-${upNext.id}`}
            initial={false}
            animate={{ scale: 0.95, y: 10, opacity: 0.7 }}
            transition={{ duration: prefs.reduced ? 0 : 0.25, ease: EASE }}
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg bg-card shadow-card"
            aria-hidden
          >
            <SwipeableProductCard product={upNext} onSwipe={() => {}} prefs={prefs} topmost={false} />
          </motion.div>
        )}

        {/* `custom` + a variant FUNCTION for exit: AnimatePresence feeds the
            latest direction to the exiting card, so it always flies off the
            side it was swiped toward (a captured `exit` object would be
            stale by one render). */}
        <AnimatePresence custom={direction} initial={false}>
          {current ? (
            <motion.div
              key={current.id}
              custom={direction}
              variants={{ exit: (dir: SwipeDirection) => deckExit(dir, prefs) }}
              initial={prefs.reduced ? false : { scale: 0.95, y: 10, opacity: 0.7 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit="exit"
              transition={{ duration: prefs.reduced ? 0 : 0.25, ease: EASE }}
              className="absolute inset-0"
            >
              <SwipeableProductCard product={current} onSwipe={act} prefs={prefs} topmost />
            </motion.div>
          ) : (
            <motion.div
              key="deck-done"
              initial={prefs.reduced ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="absolute inset-0 grid place-items-center rounded-lg bg-muted p-6 text-center"
            >
              <div className="grid justify-items-center gap-3">
                <span className="text-4xl" aria-hidden>
                  🎉
                </span>
                <h3 className="text-lg font-bold">You&apos;ve seen them all</h3>
                <p className="text-sm text-muted-foreground">
                  Saved products are waiting in your wishlist.
                </p>
                <Button variant="outline" onClick={() => setIndex(0)}>
                  Start over
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Accessible alternative to gestures — all targets ≥ 44×44px. */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={undo}
          disabled={index === 0}
          aria-label="Undo last action"
        >
          <RotateCcw className="h-5 w-5" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => act("left")}
          disabled={!current}
          aria-label="Skip this product"
          className="h-14 w-14 border-2 text-muted-foreground hover:border-muted-foreground"
        >
          <X className="h-6 w-6" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => act("right")}
          disabled={!current}
          aria-label="Save this product to wishlist"
          className="h-14 w-14 border-2 text-destructive hover:border-destructive"
        >
          <Heart className="h-6 w-6" aria-hidden />
        </Button>
      </div>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </motion.section>
  );
}
