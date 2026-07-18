# SmartGrids Storefront — Headless Drupal 11 + Next.js 15

Enterprise headless commerce: Drupal 11 + Commerce 3 as the API-only
backend (JSON:API), Next.js 15 (App Router, React 19, TypeScript,
Tailwind, shadcn-style UI, Swiper) as the storefront.

```
┌────────────┐  JSON:API (read, cached by tag)   ┌─────────────────┐
│  Drupal 11 │ ────────────────────────────────► │  Next.js 15     │
│  Commerce  │                                   │  ISR + CDN      │
│  (no theme)│ ◄──────────────────────────────── │                 │
└─────┬──────┘   checkout handoff /cart          └────────▲────────┘
      │                                                   │
      └── smartgrids_revalidate module ── POST /api/revalidate
          (entity save → cache tags invalidated in seconds)
```

## How the frontend stays in sync (no deploys)

1. Every `drupalFetch()` call tags its Next.js cache entry
   (`products`, `product:<uuid>`, `sections`, `categories`).
2. Pages are statically rendered and served from cache/CDN indefinitely.
3. When an editor saves a product/term/section in Drupal, the
   `smartgrids_revalidate` module POSTs the affected tags to
   `/api/revalidate` (shared secret header).
4. `revalidateTag()` purges exactly those entries; the next request
   re-renders with fresh data. A 1-hour time-based ISR is the safety net
   if the webhook ever fails.

## Schema-driven layout

The homepage renders whatever `section` nodes exist in Drupal, ordered by
weight — carousel / grid / banner / chips / recently_viewed kinds map to
components in `src/components/sections/SectionRenderer.tsx`. No layout is
hard-coded; `DEFAULT_SECTIONS` in `src/lib/services/sections.ts` keeps a
fresh install functional before the content type exists.

## Folder structure

```
frontend/
├── src/app/                    Routes (App Router)
│   ├── page.tsx                Homepage (schema-driven sections)
│   ├── shop/page.tsx           Catalogue: filters, sort, search, pagination
│   ├── product/[slug]/page.tsx PDP: SSG + ISR, JSON-LD, related products
│   ├── cart/ · wishlist/       Client state pages
│   ├── api/revalidate/route.ts Drupal → Next cache invalidation webhook
│   └── sitemap.ts · robots.ts  SEO
├── src/lib/
│   ├── drupal/client.ts        JSON:API fetch + deserializer + cache tags
│   ├── services/               products, sections, taxonomy (typed)
│   └── seo.ts · utils.ts
├── src/components/
│   ├── ui/                     Button, Badge, Input, Dialog/Sheet, Skeleton
│   ├── product/                ProductCard, ProductCarousel (Swiper), ProductGrid
│   ├── sections/               SectionRenderer, HeroBanner, CategoryChips, RecentlyViewed
│   ├── layout/                 Header (search), BottomNav, Footer
│   └── providers/              CartProvider, WishlistProvider
└── src/types/                  Product + Section models
```

## Drupal setup (backend-only)

1. `drush pm:enable jsonapi smartgrids_revalidate`
2. `web/sites/default/services.yml` — CORS:
   ```yaml
   parameters:
     cors.config:
       enabled: true
       allowedHeaders: ['content-type', 'accept']
       allowedMethods: ['GET']
       allowedOrigins: ['https://shop.example.com']
       supportsCredentials: false
   ```
   (Use `supportsCredentials: true` + POST/PATCH methods only if
   `NEXT_PUBLIC_CART_MODE=drupal` with the commerce_cart_api module.)
3. `settings.php`:
   ```php
   $settings['smartgrids_frontend_url'] = 'https://shop.example.com';
   $settings['smartgrids_revalidate_secret'] = getenv('REVALIDATE_SECRET');
   ```
4. Product URL aliases: pattern `/product/[commerce_product:title]`
   (pathauto). Category vocabulary: `product_category`.
5. Optional `section` content type for the schema-driven homepage
   (fields documented in `src/lib/services/sections.ts`).

## Run locally

```bash
cp .env.example .env.local   # point at your Drupal URL
npm install
npm run dev                  # http://localhost:3000
npm run typecheck && npm run build   # CI gate
```

## Deployment strategy

- **Frontend**: Vercel (zero-config ISR) or any Node host / Docker with
  `output: "standalone"`. Set `NEXT_PUBLIC_DRUPAL_BASE_URL`,
  `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`. Put the CDN in front;
  ISR pages are cache-friendly by design.
- **Backend**: Drupal on your PHP platform of choice; only
  `/jsonapi/*`, `/cart*`, checkout and admin routes need to be public.
  Restrict everything else at the edge if desired.
- **Sync**: the revalidate webhook is fire-and-forget with a 3s timeout —
  Drupal saves never block on the frontend; time-based ISR is the backstop.
- **Media**: serve Drupal files through the same CDN; `next/image`
  optimizes them on the frontend (remotePatterns configured).
