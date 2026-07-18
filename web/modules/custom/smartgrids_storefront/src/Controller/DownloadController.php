<?php

namespace Drupal\smartgrids_storefront\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Site\Settings;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * Secure digital-download delivery.
 *
 * GET /api/storefront/download?order=..&variation=..&expires=..&sig=..
 *
 * The signed URL is generated server-side by the Next.js /api/download-link
 * route (same shared secret). Private file URLs are never exposed:
 * - the signature covers order + variation + expiry (HMAC-SHA256),
 * - the order must exist, be completed/placed, and contain the variation,
 * - links expire; downloads are rate-limited and capped per order,
 * - ONLY a successfully authorised send is counted (failed, unauthorised
 *   or replayed-beyond-cap requests never increment the ledger).
 */
class DownloadController extends ControllerBase {

  /**
   * Validates the signed link and streams the file.
   */
  public function download(Request $request): Response {
    $order_id = (int) $request->query->get('order', 0);
    $variation_id = (int) $request->query->get('variation', 0);
    $expires = (int) $request->query->get('expires', 0);
    $sig = (string) $request->query->get('sig', '');

    $secret = Settings::get('smartgrids_checkout_secret');
    if (!$secret || !$order_id || !$variation_id) {
      return new JsonResponse(['message' => 'Bad request'], 400);
    }
    if ($expires < \Drupal::time()->getRequestTime()) {
      return new JsonResponse(['message' => 'This download link has expired'], 410);
    }
    $expected = hash_hmac('sha256', "{$order_id}|{$variation_id}|{$expires}", $secret);
    if (!hash_equals($expected, $sig)) {
      return new JsonResponse(['message' => 'Invalid signature'], 403);
    }

    // Rate limiting: 20 download attempts per hour per IP.
    $flood = \Drupal::flood();
    if (!$flood->isAllowed('smartgrids_download', 20, 3600)) {
      return new JsonResponse(['message' => 'Too many download attempts'], 429);
    }
    $flood->register('smartgrids_download', 3600);

    // Verify the order and its entitlement to this variation.
    /** @var \Drupal\commerce_order\Entity\OrderInterface|null $order */
    $order = $this->entityTypeManager()->getStorage('commerce_order')->load($order_id);
    if (!$order || !in_array($order->getState()->getId(), ['completed', 'fulfillment'], TRUE)) {
      return new JsonResponse(['message' => 'Order not eligible'], 403);
    }
    $entitled = FALSE;
    foreach ($order->getItems() as $item) {
      $purchased = $item->getPurchasedEntity();
      if ($purchased && (int) $purchased->id() === $variation_id) {
        $entitled = TRUE;
        break;
      }
    }
    if (!$entitled) {
      return new JsonResponse(['message' => 'Order does not include this product'], 403);
    }

    /** @var \Drupal\commerce_product\Entity\ProductVariationInterface|null $variation */
    $variation = $this->entityTypeManager()->getStorage('commerce_product_variation')->load($variation_id);
    $product = $variation?->getProduct();
    if (!$product || !$product->hasField('field_digital_file') || $product->get('field_digital_file')->isEmpty()) {
      return new JsonResponse(['message' => 'No downloadable file for this product'], 404);
    }
    /** @var \Drupal\file\FileInterface $file */
    $file = $product->get('field_digital_file')->entity;
    $uri = $file?->getFileUri();
    $real = $uri ? \Drupal::service('file_system')->realpath($uri) : NULL;
    if (!$real || !is_file($real)) {
      return new JsonResponse(['message' => 'File unavailable'], 404);
    }

    // Per-order download cap.
    $db = \Drupal::database();
    $max = (int) $this->config('smartgrids_storefront.settings')->get('max_downloads_per_order') ?: 10;
    $used = (int) $db->query(
      'SELECT COUNT(*) FROM {smartgrids_download} WHERE order_id = :o AND variation_id = :v',
      [':o' => $order_id, ':v' => $variation_id]
    )->fetchField();
    if ($used >= $max) {
      return new JsonResponse(['message' => 'Download limit reached for this order'], 403);
    }

    // Count the successful authorised download (refresh-safe: repeated
    // requests within 5 minutes count once).
    $recent = (int) $db->query(
      'SELECT COUNT(*) FROM {smartgrids_download}
       WHERE order_id = :o AND variation_id = :v AND created > :t',
      [':o' => $order_id, ':v' => $variation_id, ':t' => \Drupal::time()->getRequestTime() - 300]
    )->fetchField();
    if (!$recent) {
      $db->insert('smartgrids_download')->fields([
        'order_id' => $order_id,
        'variation_id' => $variation_id,
        'product_id' => (int) $product->id(),
        'fid' => (int) $file->id(),
        'ip' => mb_substr((string) $request->getClientIp(), 0, 45),
        'created' => \Drupal::time()->getRequestTime(),
      ])->execute();
      if (function_exists('smartgrids_revalidate_send')) {
        smartgrids_revalidate_send(['stats'], []);
      }
    }

    $response = new BinaryFileResponse($real);
    $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $file->getFilename());
    $response->headers->set('Cache-Control', 'private, no-store');
    return $response;
  }

}
