# SmartGrids theme

Mobile-first e-commerce theme for Drupal 10.3+/11 with Drupal Commerce.

## Structure

```
smartgrids_theme/
├── smartgrids_theme.info.yml        Theme definition, regions
├── smartgrids_theme.libraries.yml   CSS/JS libraries (global + per-component)
├── smartgrids_theme.theme           Preprocess, suggestions, product card hook
├── smartgrids_theme.breakpoints.yml Breakpoints for responsive images
├── logo.svg / screenshot.png
├── css/
│   ├── base.css                     Design tokens, reset, buttons, forms, focus
│   ├── layout.css                   Container, sidebar layout, product page
│   └── components/                  header, navigation, product-card,
│                                    product-grid, skeleton, filters, banner,
│                                    breadcrumbs, pagination, footer, cart, modal
├── js/                              Drupal behaviors, all using once()
│   ├── mobile-nav.js  filter-drawer.js  wishlist.js  quick-view.js  quantity.js
├── images/
└── templates/
    ├── layout/       html, page
    ├── components/   product-card, skeleton-card, promo-banner (reusable includes)
    ├── commerce/     commerce-product, commerce-product--teaser, commerce-cart-block
    ├── views/        views-view--product-grid, views-view-unformatted--product-grid
    ├── navigation/   breadcrumb, menu--main
    └── block/        block--smartgrids-cart
```

## The product-carousel tag convention (homepage rails)

Any view tagged `product_carousel` renders as a horizontal Swiper carousel
(swipeable, free-mode, "peek" slides on mobile) via
`views-view--product-carousel.html.twig` +
`views-view-unformatted--product-carousel.html.twig`. Swiper 11 ships
locally in `js/vendor/swiper/` — no CDN request.

Homepage recipe — create 3 views blocks (Show: Content | Teaser, tag
`product_carousel`, 8–12 items, "More link" enabled) and place them on
`<front>`:

- **Trending now** — sort by most recent orders/popularity (or created desc).
- **Best sellers** — sort by a sales-count field or commerce reporting data.
- **Recommended for you** — filter by featured flag or category, random sort.

**Recently viewed** is client-side (localStorage): the shell renders on the
front page and product pages automatically; `js/recently-viewed.js` records
visits on full product views and fills the rail. No server-side
personalisation, so page caching is unaffected.

## App shell

- Mobile bottom tab bar (`components/bottom-nav.html.twig`, items built in
  `smartgrids_theme_preprocess_page()` — adjust the `/shop` and `/wishlist`
  paths there).
- Sticky header, category chip scroller (`components/category-chips.html.twig`),
  tap-scale feedback, iOS safe-area padding.

## The product-grid tag convention

Any view tagged `product_grid` (Views UI → Other → Tags) automatically gets:

- the shared grid templates (`views-view--product-grid.html.twig`,
  `views-view-unformatted--product-grid.html.twig`),
- the `product-grid` + `filters` libraries attached.

So the catalogue, category pages, featured/sale/new/related blocks and search
results all share one grid implementation.

## Product card

`templates/components/product-card.html.twig` — used by
`commerce-product--teaser.html.twig` and available as the
`smartgrids_product_card` theme hook for render arrays. Card data
(prices, discount %, badge, stock, rating) is computed in
`smartgrids_theme_preprocess_commerce_product()`.

Expected (optional) fields — adjust names in `.theme` / teaser template:

- `field_product_image` (product) — use a Responsive image formatter.
- `field_product_category` or `field_category` (product, taxonomy ref).
- `field_rating` (decimal 0–5), `field_review_count` (integer) on product.
- `field_featured` (boolean) on product.
- `field_stock` (integer) on the variation, if not using commerce_stock.
- List price on the variation drives the Sale badge + discount %.
