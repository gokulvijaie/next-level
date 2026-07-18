/**
 * POST /api/download-link — generates a short-lived signed download URL
 * for a digital order item. The HMAC (shared secret) is computed
 * server-side only; Drupal's DownloadController re-verifies the order,
 * entitlement, expiry, download cap and rate limits before streaming the
 * file. Private file URLs are never exposed.
 */
import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888";
const SECRET = process.env.CHECKOUT_SECRET ?? "";
const LINK_TTL_SECONDS = 3600;

export async function POST(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ message: "Downloads not configured" }, { status: 500 });
  }
  let body: { order_id?: number; variation_id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  const orderId = Number(body.order_id);
  const variationId = Number(body.variation_id);
  if (!Number.isInteger(orderId) || !Number.isInteger(variationId) || orderId <= 0 || variationId <= 0) {
    return NextResponse.json({ message: "Invalid order or item" }, { status: 422 });
  }

  const expires = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  const sig = createHmac("sha256", SECRET)
    .update(`${orderId}|${variationId}|${expires}`)
    .digest("hex");

  return NextResponse.json({
    url: `${BASE_URL}/api/storefront/download?order=${orderId}&variation=${variationId}&expires=${expires}&sig=${sig}`,
    expires,
  });
}
