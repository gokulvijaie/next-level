/**
 * On-demand revalidation endpoint, called by the Drupal
 * smartgrids_revalidate module whenever content changes.
 *
 * POST /api/revalidate
 * Headers: x-revalidate-secret: <REVALIDATE_SECRET>
 * Body: { "tags": ["products", "product:<uuid>"], "paths": ["/", "/shop"] }
 *
 * This keeps the statically-rendered storefront in sync with Drupal: pages
 * are cached indefinitely and invalidated the moment an editor saves.
 *
 * TAGS are the primary mechanism and cover every page (the "products" tag
 * is attached to the homepage sliders, the /shop listing, and every product
 * detail fetch). PATHS are a supplementary signal for static routes.
 *
 * Each call is wrapped independently: a single failing path must never
 * discard the staged tag invalidations, which is what happens if an
 * exception escapes the handler (Next commits revalidations only when the
 * handler returns normally).
 */
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  let body: { tags?: string[]; paths?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const tags = (body.tags ?? []).slice(0, 50);
  const paths = (body.paths ?? []).slice(0, 50);
  const revalidated: { tags: string[]; paths: string[] } = { tags: [], paths: [] };

  for (const tag of tags) {
    try {
      revalidateTag(tag);
      revalidated.tags.push(tag);
    } catch (error) {
      console.error(`[revalidate] tag "${tag}" failed`, error);
    }
  }

  for (const path of paths) {
    try {
      revalidatePath(path);
      revalidated.paths.push(path);
    } catch (error) {
      console.error(`[revalidate] path "${path}" failed`, error);
    }
  }

  return NextResponse.json({ revalidated, now: Date.now() });
}
