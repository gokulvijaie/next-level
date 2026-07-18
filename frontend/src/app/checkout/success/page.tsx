"use client";

/**
 * Order confirmation. Reads the just-placed order from sessionStorage
 * (stashed by the checkout page before it cleared the cart). If a shopper
 * lands here directly, we send them back to the shop.
 */
import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Download } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { OrderResult } from "@/types/checkout";
import { formatPrice } from "@/types/product";

export default function CheckoutSuccessPage() {
  const [order, setOrder] = React.useState<OrderResult | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem("smartgrids_last_order");
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      setOrder(null);
    }
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  if (!order) {
    return (
      <div className="container grid place-items-center gap-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold">No recent order</h1>
        <p className="text-muted-foreground">We couldn&apos;t find an order to show here.</p>
        <Link href="/shop" className={buttonVariants({ size: "lg" })}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container grid max-w-lg place-items-center gap-4 py-16 text-center">
      <CheckCircle2 className="h-16 w-16 text-success" aria-hidden />
      <h1 className="text-3xl font-extrabold tracking-tight">Thank you for your order!</h1>
      <p className="text-muted-foreground">
        A confirmation has been sent to <span className="font-semibold">{order.email}</span>.
      </p>

      <dl className="mt-2 w-full rounded-lg bg-card p-5 text-left shadow-card">
        <div className="flex justify-between border-b py-2">
          <dt className="text-muted-foreground">Order number</dt>
          <dd className="font-bold">#{order.order_number}</dd>
        </div>
        <div className="flex justify-between border-b py-2">
          <dt className="text-muted-foreground">Total paid</dt>
          <dd className="font-bold">{formatPrice(Number(order.total), order.currency)}</dd>
        </div>
        <div className="flex justify-between py-2">
          <dt className="text-muted-foreground">Payment</dt>
          <dd className="font-medium capitalize">
            {order.payment_method === "cod" ? "Cash on delivery" : "Card"}
          </dd>
        </div>
      </dl>

      <DownloadList order={order} />

      <Link href="/shop" className={buttonVariants({ size: "lg" }) + " mt-2"}>
        Continue shopping
      </Link>
    </div>
  );
}

/**
 * Secure downloads for digital items: each button requests a short-lived
 * signed URL from /api/download-link; Drupal re-verifies the order,
 * entitlement, expiry and download cap before streaming the file.
 */
function DownloadList({ order }: { order: OrderResult }) {
  const [error, setError] = React.useState("");
  const downloadable = (order.items ?? []).filter((item) => item.downloadable);
  if (!downloadable.length) return null;

  const download = async (variationId: number) => {
    setError("");
    try {
      const response = await fetch("/api/download-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.order_id, variation_id: variationId }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setError(data.message ?? "Could not create the download link.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Could not reach the store. Please try again.");
    }
  };

  return (
    <div className="w-full rounded-lg bg-card p-5 text-left shadow-card">
      <h2 className="font-bold">Your downloads</h2>
      <ul className="mt-3 grid gap-2">
        {downloadable.map((item) => (
          <li key={item.variation_id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
            <Button size="sm" onClick={() => download(item.variation_id)}>
              <Download className="h-4 w-4" aria-hidden /> Download
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Links are personal, expire after an hour, and have a download limit.
      </p>
    </div>
  );
}
