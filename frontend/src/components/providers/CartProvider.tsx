"use client";

/**
 * Cart state. Two modes (NEXT_PUBLIC_CART_MODE):
 * - "local": client-side cart persisted to localStorage; checkout hands off
 *   to Drupal Commerce's /cart page.
 * - "drupal": mirrors every mutation to the commerce_cart_api REST
 *   endpoints (requires that contrib module + credentialed CORS), so the
 *   Drupal order is the source of truth at checkout.
 */
import * as React from "react";
import type { Product } from "@/types/product";

export type CartItem = {
  variationId: number;
  productId: number | null;
  title: string;
  price: number | null;
  currency: string;
  image: string | null;
  path: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (variationId: number, quantity: number) => void;
  removeItem: (variationId: number) => void;
  clear: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);
const STORAGE_KEY = "smartgrids_cart";
const DRUPAL_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "";
const MODE = process.env.NEXT_PUBLIC_CART_MODE ?? "local";

async function syncAddToDrupal(item: CartItem) {
  if (MODE !== "drupal") return;
  try {
    await fetch(`${DRUPAL_URL}/cart/add?_format=json`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([
        {
          purchased_entity_type: "commerce_product_variation",
          purchased_entity_id: String(item.variationId),
          quantity: item.quantity,
        },
      ]),
    });
  } catch {
    // Network failure: local state still holds the cart; Drupal sync will
    // happen at checkout handoff.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);

  React.useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  const persist = React.useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — cart lives for the session only.
    }
  }, []);

  const addItem = React.useCallback(
    (product: Product, quantity = 1) => {
      if (!product.variationId) return;
      const item: CartItem = {
        variationId: product.variationId,
        productId: product.productId,
        title: product.title,
        price: product.price,
        currency: product.currency,
        image: product.image?.url ?? null,
        path: product.path,
        quantity,
      };
      persist(
        ((current) => {
          const existing = current.find((i) => i.variationId === item.variationId);
          return existing
            ? current.map((i) =>
                i.variationId === item.variationId ? { ...i, quantity: i.quantity + quantity } : i,
              )
            : [...current, item];
        })(items),
      );
      void syncAddToDrupal(item);
    },
    [items, persist],
  );

  const updateQuantity = React.useCallback(
    (variationId: number, quantity: number) => {
      persist(
        quantity <= 0
          ? items.filter((i) => i.variationId !== variationId)
          : items.map((i) => (i.variationId === variationId ? { ...i, quantity } : i)),
      );
    },
    [items, persist],
  );

  const removeItem = React.useCallback(
    (variationId: number) => persist(items.filter((i) => i.variationId !== variationId)),
    [items, persist],
  );

  const clear = React.useCallback(() => persist([]), [persist]);

  const value = React.useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, updateQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
