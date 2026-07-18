/**
 * @file
 * Initialises Swiper on every [data-sg-carousel] element.
 *
 * Markup contract (see templates/components/product-carousel.html.twig):
 * .sg-carousel > .swiper > .swiper-wrapper > .swiper-slide, with optional
 * [data-sg-carousel-prev] / [data-sg-carousel-next] buttons and a
 * .swiper-pagination element inside the .sg-carousel wrapper.
 */

((Drupal, once) => {
  'use strict';

  Drupal.behaviors.smartgridsCarousel = {
    attach(context) {
      if (typeof Swiper === 'undefined') {
        return;
      }

      once('sg-carousel', '[data-sg-carousel]', context).forEach((root) => {
        const swiperEl = root.querySelector('.swiper');
        if (!swiperEl) {
          return;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const dense = root.hasAttribute('data-sg-carousel-dense');

        // eslint-disable-next-line no-new
        new Swiper(swiperEl, {
          slidesPerView: 1.2,
          spaceBetween: 12,
          freeMode: {
            enabled: true,
            sticky: true,
          },
          speed: reducedMotion ? 0 : 400,
          // Fractional views create the "peek" that invites swiping.
          breakpoints: {
            480: { slidesPerView: 2.2, spaceBetween: 12 },
            768: { slidesPerView: 3.2, spaceBetween: 16 },
            1024: { slidesPerView: dense ? 5 : 4, spaceBetween: 16 },
            1280: { slidesPerView: dense ? 6 : 5, spaceBetween: 20 },
          },
          navigation: {
            prevEl: root.querySelector('[data-sg-carousel-prev]'),
            nextEl: root.querySelector('[data-sg-carousel-next]'),
          },
          pagination: {
            el: root.querySelector('.swiper-pagination'),
            type: 'progressbar',
          },
          a11y: {
            prevSlideMessage: Drupal.t('Previous products'),
            nextSlideMessage: Drupal.t('Next products'),
          },
          watchSlidesProgress: true,
        });
      });
    },
  };
})(Drupal, once);
