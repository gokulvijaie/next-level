/**
 * @file
 * Recently viewed products.
 *
 * Two responsibilities:
 * 1. On full product pages, record the product (drupalSettings.smartgrids
 *    .product, set in smartgrids_theme_preprocess_commerce_product()) into
 *    localStorage.
 * 2. Wherever the recently-viewed component is placed
 *    ([data-sg-recently-viewed]), render the stored products as card
 *    slides and hand the container to the carousel behavior.
 *
 * Fully client-side, so pages stay cacheable for anonymous users.
 */

((Drupal, drupalSettings, once) => {
  'use strict';

  const STORAGE_KEY = 'smartgrids_recently_viewed';
  const MAX_ITEMS = 12;

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }
    catch (e) {
      return [];
    }
  };

  const write = (items) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    }
    catch (e) {
      // Storage unavailable — fail silently.
    }
  };

  // Text nodes only — product data comes from our own drupalSettings, but
  // building DOM via createElement keeps this XSS-safe regardless.
  const buildSlide = (item) => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';

    const card = document.createElement('article');
    card.className = 'product-card';

    const media = document.createElement('div');
    media.className = 'product-card__media';
    if (item.image) {
      const img = document.createElement('img');
      img.src = item.image;
      img.alt = '';
      img.loading = 'lazy';
      media.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'product-card__body';

    const title = document.createElement('h3');
    title.className = 'product-card__title';
    const link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.title;
    title.appendChild(link);

    const priceRow = document.createElement('div');
    priceRow.className = 'product-card__price-row';
    if (item.price) {
      const price = document.createElement('span');
      price.className = 'product-card__price';
      price.textContent = item.price;
      priceRow.appendChild(price);
    }

    body.appendChild(title);
    body.appendChild(priceRow);
    card.appendChild(media);
    card.appendChild(body);
    slide.appendChild(card);
    return slide;
  };

  Drupal.behaviors.smartgridsRecentlyViewed = {
    attach(context) {
      // 1. Record the current product.
      once('sg-recent-record', 'body', context).forEach(() => {
        const product = drupalSettings.smartgrids && drupalSettings.smartgrids.product;
        if (!product || !product.id) {
          return;
        }
        const items = read().filter((i) => i.id !== product.id);
        items.unshift(product);
        write(items);
      });

      // 2. Render the rail.
      once('sg-recent-render', '[data-sg-recently-viewed]', context).forEach((section) => {
        const current = drupalSettings.smartgrids && drupalSettings.smartgrids.product;
        const items = read().filter((i) => !current || i.id !== current.id);
        if (!items.length) {
          section.hidden = true;
          return;
        }

        const wrapper = section.querySelector('.swiper-wrapper');
        items.forEach((item) => wrapper.appendChild(buildSlide(item)));
        section.hidden = false;

        // The slides now exist. The template deliberately omits
        // data-sg-carousel so the carousel behavior could not initialise an
        // empty Swiper on page load; add it now and initialise.
        const carousel = section.querySelector('.sg-carousel');
        if (carousel) {
          carousel.setAttribute('data-sg-carousel', '');
          Drupal.behaviors.smartgridsCarousel.attach(section);
        }
      });
    },
  };
})(Drupal, drupalSettings, once);
