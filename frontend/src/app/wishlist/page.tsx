"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";

export default function WishlistPage() {
  const { items } = useWishlist();
  const { format } = useCurrency();

  if (!items.length) {
    return (
      <div className="container grid place-items-center gap-4 py-24 text-center">
        <Heart className="h-12 w-12 text-muted-foreground" aria-hidden />
        <h1 className="text-2xl font-extrabold">Your wishlist is empty</h1>
        <p className="text-muted-foreground">Tap the heart on any product to save it here.</p>
        <Link href="/shop" className={buttonVariants({ size: "lg" })}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Wishlist</h1>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <Link
              href={item.path}
              className="group block h-full overflow-hidden rounded-lg bg-card shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="relative aspect-[4/5] bg-muted">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 45vw, 20vw"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : (
                  <ProductImagePlaceholder />
                )}
              </div>
              <div className="p-3">
                <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{item.title}</h2>
                <p className="mt-1 font-bold">{format(item.price, item.currency)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
