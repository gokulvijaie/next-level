"use client";

/**
 * PDP purchase controls: quantity stepper + animated add-to-cart and
 * wishlist (desktop/inline), plus a sticky mobile purchase bar that keeps
 * price and Buy Now within thumb reach, sitting above the bottom nav.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import {
  AnimatedAddToCartButton,
  AnimatedWishlistButton,
} from "@/components/product/AnimatedButtons";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/providers/CartProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { EASE, useMotionPrefs } from "@/lib/motion";
import type { Product } from "@/types/product";

export function ProductActions({ product }: { product: Product }) {
  const prefs = useMotionPrefs();
  const [quantity, setQuantity] = React.useState(1);

  const StepButton = ({ delta, label }: { delta: number; label: string }) => (
    <motion.button
      type="button"
      aria-label={label}
      whileTap={prefs.reduced ? undefined : { scale: 0.9 }}
      transition={{ duration: 0.12, ease: EASE }}
      className="grid w-11 min-w-11 place-items-center bg-secondary font-bold hover:bg-border"
      onClick={() => setQuantity((q) => Math.max(1, q + delta))}
    >
      {delta < 0 ? <Minus className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
    </motion.button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex h-12 items-stretch overflow-hidden rounded-md border">
        <StepButton delta={-1} label="Decrease quantity" />
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
          aria-label="Quantity"
          className="w-14 border-x bg-background text-center font-semibold [appearance:textfield] focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <StepButton delta={1} label="Increase quantity" />
      </div>

      <AnimatedAddToCartButton product={product} quantity={quantity} size="lg" />
      <AnimatedWishlistButton product={product} showLabel />
    </div>
  );
}

/**
 * Sticky bottom purchase bar (mobile only): converted price + add-to-cart
 * + orange Buy Now. Buy Now adds the item and goes straight to checkout.
 */
export function StickyPurchaseBar({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { format } = useCurrency();

  const buyNow = () => {
    if (!product.inStock) return;
    addItem(product, 1);
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 border-t bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <p className="text-xl font-extrabold">
          {product.isFree ? "Free" : format(product.price, product.currency)}
        </p>
        <div className="flex items-center gap-2">
          <AnimatedAddToCartButton product={product} iconOnly />
          <Button variant="cta" size="lg" disabled={!product.inStock} onClick={buyNow}>
            <ShoppingCart className="h-4 w-4" aria-hidden />
            {product.inStock ? "Buy Now" : "Out of stock"}
          </Button>
        </div>
      </div>
    </div>
  );
}
