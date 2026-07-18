"use client";

/** Cart page — client-rendered from cart state; checkout hands off to Drupal. */
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCart } from "@/components/providers/CartProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { format } = useCurrency();
  const currency = items[0]?.currency ?? "USD";

  if (!items.length) {
    return (
      <div className="container grid place-items-center gap-4 py-24 text-center">
        <span className="text-5xl" aria-hidden>
          🛒
        </span>
        <h1 className="text-2xl font-extrabold">Your cart is empty</h1>
        <p className="text-muted-foreground">Find something you love in the shop.</p>
        <Link href="/shop" className={buttonVariants({ size: "lg" })}>
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="grid gap-4">
          {items.map((item) => (
            <li
              key={item.variationId}
              className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-lg bg-card p-3 shadow-card"
            >
              <Link href={item.path} className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
                {item.image ? (
                  <Image src={item.image} alt="" fill sizes="5rem" className="object-contain p-1" />
                ) : (
                  <ProductImagePlaceholder />
                )}
              </Link>
              <div className="min-w-0">
                <Link href={item.path} className="line-clamp-2 font-semibold hover:text-primary">
                  {item.title}
                </Link>
                <p className="mt-1 font-bold">{format(item.price, item.currency)}</p>
                <div className="mt-2 inline-flex items-stretch overflow-hidden rounded-md border">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${item.title}`}
                    className="grid w-9 place-items-center bg-secondary hover:bg-border"
                    onClick={() => updateQuantity(item.variationId, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="grid w-10 place-items-center text-sm font-semibold" aria-live="polite">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${item.title}`}
                    className="grid w-9 place-items-center bg-secondary hover:bg-border"
                    onClick={() => updateQuantity(item.variationId, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${item.title} from cart`}
                onClick={() => removeItem(item.variationId)}
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg bg-card p-5 shadow-card" aria-label="Order summary">
          <h2 className="text-lg font-bold">Summary</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-bold">{format(subtotal, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <Link href="/checkout" className={buttonVariants({ size: "lg" }) + " mt-4 w-full"}>
            Checkout
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Secure checkout · guest checkout available.
          </p>
        </aside>
      </div>
    </div>
  );
}
