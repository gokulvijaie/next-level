/**
 * @file
 * Quick-view modal. Builds a native <dialog> from data attributes on the
 * product card, so no extra request is needed. <dialog> gives us focus
 * trapping, Escape handling and ::backdrop for free.
 */

((Drupal, once) => {
  'use strict';

  let dialog = null;

  const buildDialog = () => {
    dialog = document.createElement('dialog');
    dialog.className = 'sg-modal';
    dialog.innerHTML =
      '<div class="sg-modal__inner">' +
      '<div class="sg-modal__media"><img alt="" data-qv-image></div>' +
      '<div class="sg-modal__body">' +
      '<h2 data-qv-title></h2>' +
      '<p class="sg-modal__price" data-qv-price></p>' +
      '<p><a class="sg-btn" data-qv-link href="#"></a></p>' +
      '</div>' +
      '</div>' +
      '<button type="button" class="sg-icon-btn sg-modal__close" data-qv-close>' +
      `<span class="visually-hidden">${Drupal.t('Close quick view')}</span>` +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '</button>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-qv-close]').addEventListener('click', () => dialog.close());
    // Close when the backdrop (the dialog element itself) is clicked.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  };

  Drupal.behaviors.smartgridsQuickView = {
    attach(context) {
      once('sg-quick-view', '[data-sg-quick-view]', context).forEach((btn) => {
        btn.addEventListener('click', () => {
          if (!dialog) {
            buildDialog();
          }
          const img = dialog.querySelector('[data-qv-image]');
          img.src = btn.getAttribute('data-sg-image') || '';
          img.alt = btn.getAttribute('data-sg-title') || '';
          dialog.querySelector('[data-qv-title]').textContent = btn.getAttribute('data-sg-title') || '';
          dialog.querySelector('[data-qv-price]').textContent = btn.getAttribute('data-sg-price') || '';
          const link = dialog.querySelector('[data-qv-link]');
          link.href = btn.getAttribute('data-sg-url') || '#';
          link.textContent = Drupal.t('View full details');
          dialog.showModal();
        });
      });
    },
  };
})(Drupal, once);
