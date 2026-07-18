"use client";

import * as React from "react";
import type { Product } from "@/types/product";

export type WishlistItem = Pick<Product, "id" | "title" | "path" | "price" | "currency"> & {
  image: string | null;
};

type WishlistContextValue = {
  items: WishlistItem[];
  has: (id: string) => boolean;
  toggle: (product: Product) => void;
};

const WishlistContext = React.createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "smartgrids_wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<WishlistItem[]>([]);

  React.useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const persist = (next: WishlistItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable.
    }
  };

  const has = React.useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const toggle = React.useCallback(
    (product: Product) => {
      persist(
        items.some((i) => i.id === product.id)
          ? items.filter((i) => i.id !== product.id)
          : [
              ...items,
              {
                id: product.id,
                title: product.title,
                path: product.path,
                price: product.price,
                currency: product.currency,
                image: product.image?.url ?? null,
              },
            ],
      );
    },
    [items],
  );

  const value = React.useMemo(() => ({ items, has, toggle }), [items, has, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
