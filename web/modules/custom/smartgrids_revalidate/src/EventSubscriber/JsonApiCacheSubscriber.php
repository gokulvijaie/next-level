<?php

namespace Drupal\smartgrids_revalidate\EventSubscriber;

use Drupal\Core\PageCache\ResponsePolicyInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Keeps JSON:API responses out of Drupal's Internal Page Cache.
 *
 * Why: the decoupled storefront caches everything with Next.js ISR and only
 * re-fetches Drupal when content changes (on-demand revalidation). If those
 * rare revalidation fetches read a page-cached JSON:API response, they can
 * pick up STALE data during the brief window around a save — and Next then
 * re-caches that stale data under its own tags until the next change.
 *
 * Triggering the page-cache kill switch for JSON:API requests guarantees the
 * storefront always reads the true current state. The entity render cache and
 * dynamic page cache still do the heavy lifting inside Drupal, so the cost is
 * negligible (the frontend hits Drupal infrequently by design).
 */
class JsonApiCacheSubscriber implements EventSubscriberInterface {

  public function __construct(
    private readonly ResponsePolicyInterface $killSwitch,
  ) {}

  /**
   * Disables the Internal Page Cache for JSON:API requests.
   */
  public function onRequest(RequestEvent $event): void {
    if (!$event->isMainRequest()) {
      return;
    }
    $path = $event->getRequest()->getPathInfo();
    if (str_starts_with($path, '/jsonapi')) {
      $this->killSwitch->trigger();
    }
  }

  /**
   * {@inheritdoc}
   */
  public static function getSubscribedEvents(): array {
    // Run early so the page cache never serves/stores this response.
    return [KernelEvents::REQUEST => ['onRequest', 300]];
  }

}
