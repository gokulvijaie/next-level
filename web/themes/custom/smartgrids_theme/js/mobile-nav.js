/**
 * @file
 * Mobile navigation toggle.
 */

((Drupal, once) => {
  'use strict';

  Drupal.behaviors.smartgridsMobileNav = {
    attach(context) {
      once('sg-mobile-nav', '[data-sg-nav-toggle]', context).forEach((toggle) => {
        const targetId = toggle.getAttribute('aria-controls');
        const panel = document.getElementById(targetId);
        if (!panel) {
          return;
        }

        toggle.addEventListener('click', () => {
          const expanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!expanded));
          panel.hidden = expanded;
        });

        // Close the panel with Escape and return focus to the toggle.
        panel.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            toggle.setAttribute('aria-expanded', 'false');
            panel.hidden = true;
            toggle.focus();
          }
        });
      });
    },
  };
})(Drupal, once);
