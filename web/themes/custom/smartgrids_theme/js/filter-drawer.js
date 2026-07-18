/**
 * @file
 * Mobile filter drawer: opens/closes the filter sidebar off-canvas.
 */

((Drupal, once) => {
  'use strict';

  Drupal.behaviors.smartgridsFilterDrawer = {
    attach(context) {
      once('sg-filter-drawer', '[data-sg-filters]', context).forEach((drawer) => {
        const openBtn = document.querySelector('[data-sg-filters-open]');
        const closeBtn = drawer.querySelector('[data-sg-filters-close]');
        const backdrop = document.querySelector('[data-sg-filters-backdrop]');
        let lastFocused = null;

        const setOpen = (open) => {
          drawer.classList.toggle('is-open', open);
          if (backdrop) {
            backdrop.classList.toggle('is-open', open);
          }
          if (openBtn) {
            openBtn.setAttribute('aria-expanded', String(open));
          }
          document.body.style.overflow = open ? 'hidden' : '';
          if (open) {
            lastFocused = document.activeElement;
            (closeBtn || drawer).focus();
          }
          else if (lastFocused) {
            lastFocused.focus();
          }
        };

        if (openBtn) {
          openBtn.addEventListener('click', () => setOpen(true));
        }
        if (closeBtn) {
          closeBtn.addEventListener('click', () => setOpen(false));
        }
        if (backdrop) {
          backdrop.addEventListener('click', () => setOpen(false));
        }
        drawer.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            setOpen(false);
          }
        });
      });
    },
  };
})(Drupal, once);
