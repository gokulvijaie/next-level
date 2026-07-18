/**
 * Server-side checkout service. Runs only in the Next.js API route
 * (never the browser) so the shared secret stays private. Forwards the
 * validated payload to the Drupal smartgrids_checkout endpoint, which
 * creates the guest Commerce order.
 */
import "server-only";
import type { CheckoutPayload, OrderResult } from "@/types/checkout";

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888";
const SECRET = process.env.CHECKOUT_SECRET ?? "";

export type CheckoutOutcome =
  | { ok: true; order: OrderResult }
  | { ok: false; status: number; message: string };

export async function placeOrder(payload: CheckoutPayload): Promise<CheckoutOutcome> {
  if (!SECRET) {
    return { ok: false, status: 500, message: "Checkout is not configured (missing secret)" };
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/storefront/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-checkout-secret": SECRET },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, message: "Could not reach the store. Please try again." };
  }

  const body = (await response.json().catch(() => ({}))) as Partial<OrderResult> & {
    message?: string;
  };

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: body.message ?? "Checkout failed. Please review your details and try again.",
    };
  }

  return { ok: true, order: body as OrderResult };
}
