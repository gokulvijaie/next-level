/**
 * @file
 * Quantity stepper. Wraps number inputs in cart/add-to-cart forms with
 * accessible increment/decrement buttons.
 */

((Drupal, once) => {
  'use strict';

  const selector =
    '.cart-form input[type="number"], .commerce-order-item-add-to-cart-form input[type="number"]';

  Drupal.behaviors.smartgridsQuantity = {
    attach(context) {
      once('sg-qty', selector, context).forEach((input) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'sg-qty';
        input.parentNode.insertBefore(wrapper, input);

        const makeButton = (label, delta) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'sg-qty__btn';
          btn.textContent = delta > 0 ? '+' : '−';
          btn.setAttribute('aria-label', label);
          btn.addEventListener('click', () => {
            const min = input.min !== '' ? Number(input.min) : 0;
            const max = input.max !== '' ? Number(input.max) : Infinity;
            const value = Number(input.value) || 0;
            input.value = Math.min(max, Math.max(min, value + delta));
            // Let Commerce AJAX cart updates react to the change.
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
          return btn;
        };

        wrapper.appendChild(makeButton(Drupal.t('Decrease quantity'), -1));
        wrapper.appendChild(input);
        wrapper.appendChild(makeButton(Drupal.t('Increase quantity'), 1));
      });
    },
  };
})(Drupal, once);
