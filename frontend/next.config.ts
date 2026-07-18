import type { NextConfig } from "next";

const drupalUrl = new URL(process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? "http://localhost:8888");

const nextConfig: NextConfig = {
  // Builds use their own directory so `next build` can run while
  // `next dev` is serving from .next (they corrupt each other otherwise).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: drupalUrl.protocol.replace(":", "") as "http" | "https",
        hostname: drupalUrl.hostname,
        port: drupalUrl.port,
        pathname: "/sites/default/files/**",
      },
    ],
  },
  // Serve a strict, cacheable app. Drupal is the only mutable dependency and
  // it invalidates us via /api/revalidate.
  poweredByHeader: false,
};

export default nextConfig;
