import type { MetadataRoute } from "next";
import { getAllProductPaths } from "@/lib/services/products";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productPaths: string[] = [];
  try {
    productPaths = await getAllProductPaths();
  } catch {
    // Backend unreachable at build time — ship the static routes.
  }

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...productPaths.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
