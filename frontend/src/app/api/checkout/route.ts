/**
 * POST /api/checkout — server-side order placement.
 *
 * Validates the checkout payload, then hands off to Drupal Commerce via the
 * checkout service (which holds the shared secret server-side). The browser
 * never sees the secret and never talks to Drupal's order API directly.
 */
import { NextResponse, type NextRequest } from "next/server";
import { placeOrder } from "@/lib/services/checkout";
import type { CheckoutPayload, ShippingAddress } from "@/types/checkout";

const REQUIRED_ADDRESS_FIELDS: (keyof ShippingAddress)[] = [
  "given_name",
  "family_name",
  "address_line1",
  "locality",
  "postal_code",
  "country_code",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!payload.email || !EMAIL_RE.test(payload.email)) {
    return NextResponse.json({ message: "A valid email address is required" }, { status: 422 });
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json({ message: "Your cart is empty" }, { status: 422 });
  }
  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!payload.shipping_address?.[field]) {
      return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 422 });
    }
  }

  // Normalize items to the backend contract (defensive against tampering).
  const items = payload.items
    .map((item) => ({
      variation_id: Number(item.variation_id),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
    }))
    .filter((item) => Number.isInteger(item.variation_id) && item.variation_id > 0);

  if (items.length === 0) {
    return NextResponse.json({ message: "No valid items to order" }, { status: 422 });
  }

  const outcome = await placeOrder({ ...payload, items });

  if (!outcome.ok) {
    return NextResponse.json({ message: outcome.message }, { status: outcome.status });
  }
  return NextResponse.json({ order: outcome.order }, { status: 201 });
}
