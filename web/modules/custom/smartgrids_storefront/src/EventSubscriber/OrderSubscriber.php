<?php

namespace Drupal\smartgrids_storefront\EventSubscriber;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Database\Connection;
use Drupal\state_machine\Event\WorkflowTransitionEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Records purchase statistics when an order is placed.
 *
 * Counts only orders that pass through the "place" transition (i.e. real
 * completed checkouts — never abandoned carts or drafts). The ledger has a
 * UNIQUE(order_id, variation_id) key and uses MERGE, so replayed events,
 * duplicate webhooks or double submissions can never inflate the count.
 */
class OrderSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly Connection $database,
    private readonly TimeInterface $time,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    return ['commerce_order.place.post_transition' => 'onOrderPlace'];
  }

  /**
   * Writes one idempotent ledger row per order item.
   */
  public function onOrderPlace(WorkflowTransitionEvent $event): void {
    /** @var \Drupal\commerce_order\Entity\OrderInterface $order */
    $order = $event->getEntity();

    foreach ($order->getItems() as $item) {
      $purchased = $item->getPurchasedEntity();
      if (!$purchased || $purchased->getEntityTypeId() !== 'commerce_product_variation') {
        continue;
      }
      /** @var \Drupal\commerce_product\Entity\ProductVariationInterface $purchased */
      $product = $purchased->getProduct();
      $total = $item->getTotalPrice();

      $this->database->merge('smartgrids_purchase')
        ->keys([
          'order_id' => (int) $order->id(),
          'variation_id' => (int) $purchased->id(),
        ])
        ->fields([
          'product_id' => $product ? (int) $product->id() : 0,
          'quantity' => (int) $item->getQuantity(),
          'currency' => $total ? $total->getCurrencyCode() : 'USD',
          'created' => $this->time->getRequestTime(),
        ])
        ->execute();
    }

    // Let the storefront refresh purchase-count driven sections.
    if (function_exists('smartgrids_revalidate_send')) {
      smartgrids_revalidate_send(['stats', 'products'], []);
    }
  }

}
