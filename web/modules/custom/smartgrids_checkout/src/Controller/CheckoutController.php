<?php

namespace Drupal\smartgrids_checkout\Controller;

use Drupal\commerce_order\Adjustment;
use Drupal\commerce_order\Entity\Order;
use Drupal\commerce_order\Entity\OrderItem;
use Drupal\commerce_price\Price;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Site\Settings;
use Drupal\profile\Entity\Profile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Creates guest Commerce orders for the decoupled storefront.
 *
 * Contract (POST /api/storefront/checkout), JSON body:
 * {
 *   "email": "buyer@example.com",
 *   "items": [{ "variation_id": 1, "quantity": 2 }],
 *   "shipping_address": {
 *     "given_name", "family_name", "address_line1", "address_line2",
 *     "locality", "administrative_area", "postal_code", "country_code"
 *   },
 *   "shipping_method": { "label": "Express", "amount": "9.99" },
 *   "payment_method": "cod" | "card"
 * }
 *
 * Auth: header `x-checkout-secret` must equal
 * $settings['smartgrids_checkout_secret']. Called server-to-server from the
 * Next.js /api/checkout route only.
 */
class CheckoutController extends ControllerBase {

  /**
   * Handles order placement.
   */
  public function placeOrder(Request $request): JsonResponse {
    // 1. Authenticate the server-to-server call.
    $secret = Settings::get('smartgrids_checkout_secret');
    $provided = $request->headers->get('x-checkout-secret', '');
    if (!$secret || !hash_equals((string) $secret, (string) $provided)) {
      return new JsonResponse(['message' => 'Unauthorized'], 401);
    }

    // 2. Parse and validate the payload.
    $data = json_decode($request->getContent(), TRUE);
    if (!is_array($data)) {
      return new JsonResponse(['message' => 'Invalid JSON body'], 400);
    }

    $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    if (!$email) {
      return new JsonResponse(['message' => 'A valid email is required'], 422);
    }

    $items = $data['items'] ?? [];
    if (!is_array($items) || $items === []) {
      return new JsonResponse(['message' => 'The cart is empty'], 422);
    }

    $address = $data['shipping_address'] ?? [];
    foreach (['given_name', 'family_name', 'address_line1', 'locality', 'postal_code', 'country_code'] as $required) {
      if (empty($address[$required])) {
        return new JsonResponse(['message' => "Missing address field: {$required}"], 422);
      }
    }

    try {
      $order = $this->buildOrder($email, $items, $address, $data);
    }
    catch (\InvalidArgumentException $e) {
      return new JsonResponse(['message' => $e->getMessage()], 422);
    }
    catch (\Throwable $e) {
      $this->getLogger('smartgrids_checkout')->error('Checkout failed: @m', ['@m' => $e->getMessage()]);
      return new JsonResponse(['message' => 'Could not place the order'], 500);
    }

    $total = $order->getTotalPrice();

    // Per-item summary so the storefront can offer secure download links
    // for digital items straight from the confirmation page.
    $order_items = [];
    foreach ($order->getItems() as $item) {
      $purchased = $item->getPurchasedEntity();
      if (!$purchased) {
        continue;
      }
      $product = $purchased->getProduct();
      $order_items[] = [
        'variation_id' => (int) $purchased->id(),
        'title' => $item->getTitle(),
        'quantity' => (int) $item->getQuantity(),
        'downloadable' => $product
          && $product->hasField('field_digital_file')
          && !$product->get('field_digital_file')->isEmpty(),
      ];
    }

    return new JsonResponse([
      'order_id' => (int) $order->id(),
      'order_number' => $order->getOrderNumber() ?: (string) $order->id(),
      'email' => $email,
      'total' => $total ? $total->getNumber() : '0',
      'currency' => $total ? $total->getCurrencyCode() : 'USD',
      'state' => $order->getState()->getId(),
      'payment_method' => $data['payment_method'] ?? 'cod',
      'items' => $order_items,
    ], 201);
  }

  /**
   * Builds, populates and saves the order. Returns the saved order.
   */
  private function buildOrder(string $email, array $items, array $address, array $data): Order {
    $store = $this->entityTypeManager()->getStorage('commerce_store')->loadDefault();
    if (!$store) {
      throw new \RuntimeException('No default store configured');
    }

    /** @var \Drupal\commerce_order\Entity\Order $order */
    $order = Order::create([
      'type' => 'default',
      'store_id' => $store->id(),
      'mail' => $email,
      'uid' => 0,
      'ip_address' => \Drupal::request()->getClientIp(),
      'cart' => FALSE,
    ]);

    $variationStorage = $this->entityTypeManager()->getStorage('commerce_product_variation');
    $currency = $store->getDefaultCurrencyCode();

    foreach ($items as $line) {
      $variationId = (int) ($line['variation_id'] ?? 0);
      $quantity = (int) ($line['quantity'] ?? 0);
      if ($variationId <= 0 || $quantity <= 0) {
        continue;
      }
      /** @var \Drupal\commerce_product\Entity\ProductVariationInterface|null $variation */
      $variation = $variationStorage->load($variationId);
      if (!$variation || !$variation->isPublished()) {
        throw new \InvalidArgumentException("Product variation {$variationId} is unavailable");
      }
      $orderItem = OrderItem::create([
        'type' => $variation->getOrderItemTypeId(),
        'purchased_entity' => $variation,
        'quantity' => (string) $quantity,
        'unit_price' => $variation->getPrice(),
        'title' => $variation->getOrderItemTitle(),
      ]);
      $orderItem->save();
      $order->addItem($orderItem);
      // Take the store currency from the first priced item if needed.
      $currency = $variation->getPrice()->getCurrencyCode();
    }

    if (!$order->getItems()) {
      throw new \InvalidArgumentException('No valid items to order');
    }

    // Shipping as a custom adjustment (commerce_shipping not required).
    $shipping = $data['shipping_method'] ?? NULL;
    if (is_array($shipping) && !empty($shipping['amount']) && (float) $shipping['amount'] > 0) {
      // 'custom' is always available; 'shipping' needs commerce_shipping.
      $order->addAdjustment(new Adjustment([
        'type' => 'custom',
        'label' => (string) ($shipping['label'] ?? 'Shipping'),
        'amount' => new Price((string) $shipping['amount'], $currency),
        'locked' => TRUE,
      ]));
    }

    // Billing profile carries the address (works without commerce_shipping).
    $profile = Profile::create([
      'type' => 'customer',
      'uid' => 0,
    ]);
    $profile->set('address', [
      'country_code' => $address['country_code'],
      'given_name' => $address['given_name'],
      'family_name' => $address['family_name'],
      'address_line1' => $address['address_line1'],
      'address_line2' => $address['address_line2'] ?? '',
      'locality' => $address['locality'],
      'administrative_area' => $address['administrative_area'] ?? '',
      'postal_code' => $address['postal_code'],
    ]);
    $profile->save();
    $order->setBillingProfile($profile);

    $order->recalculateTotalPrice();
    $order->save();

    // Move the order out of the cart into a placed state where the workflow
    // allows it (also assigns the order number). Payment capture is left to
    // a gateway; "cod" orders are legitimately unpaid at this point.
    try {
      $transitions = $order->getState()->getTransitions();
      if (isset($transitions['place'])) {
        $order->getState()->applyTransitionById('place');
        $order->save();
      }
    }
    catch (\Throwable $e) {
      // Non-fatal: the order exists; it can be placed from the admin UI.
      $this->getLogger('smartgrids_checkout')->warning('Could not auto-place order @id: @m', [
        '@id' => $order->id(),
        '@m' => $e->getMessage(),
      ]);
    }

    return $order;
  }

}
