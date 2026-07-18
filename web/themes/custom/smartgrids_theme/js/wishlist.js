/**
 * @file
 * Wishlist toggle. Stores product IDs in localStorage as a lightweight
 * anonymous wishlist. Swap the storage calls for the commerce_wishlist
 * module's endpoints when that module is enabled.
 */

((Drupal, once) => {
  'use strict';

  const STORAGE_KEY = 'smartgrids_wishlist';

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }
    catch (e) {
      return [];
    }
  };

  const write = (ids) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
    catch (e) {
      // Storage unavailable (private mode) — fail silently.
    }
  };

  Drupal.behaviors.smartgridsWishlist = {
    attach(context) {
      once('sg-wishlist', '[data-sg-wishlist]', context).forEach((btn) => {
        const id = btn.getAttribute('data-sg-wishlist');
        const title = btn.getAttribute('data-sg-title') || '';

        // Restore persisted state.
        if (read().includes(id)) {
          btn.setAttribute('aria-pressed', 'true');
        }

        btn.addEventListener('click', () => {
          const ids = read();
          const active = ids.includes(id);
          write(active ? ids.filter((i) => i !== id) : [...ids, id]);
          btn.setAttribute('aria-pressed', String(!active));
          Drupal.announce(
            active
              ? Drupal.t('@title removed from wishlist.', { '@title': title })
              : Drupal.t('@title added to wishlist.', { '@title': title })
          );
        });
      });
    },
  };
})(Drupal, once);
