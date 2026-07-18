/**
 * GET /api/notifications — proxies the Drupal broadcast-notification feed.
 * Proxying keeps CORS closed on Drupal and lets Next cache the response
 * briefly (the bell polls every 60s across all visitors).
 */
import { NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888";

export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/api/storefront/notifications`, {
      headers: { Accept: "application/json" },
      next: { tags: ["drupal", "notifications"], revalidate: 60 },
    });
    if (!response.ok) throw new Error(String(response.status));
    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
