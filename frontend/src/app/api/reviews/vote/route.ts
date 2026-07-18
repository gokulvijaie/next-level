/** POST /api/reviews/vote — helpful / not-helpful voting proxy. */
import { NextResponse, type NextRequest } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888";
const SECRET = process.env.CHECKOUT_SECRET ?? "";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";

  try {
    const response = await fetch(`${BASE_URL}/api/storefront/reviews/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-storefront-secret": SECRET },
      body: JSON.stringify({ ...body, client_ip: clientIp }),
      cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ message: "Could not reach the store" }, { status: 502 });
  }
}
