<?php

namespace Drupal\smartgrids_storefront\Controller;

use Drupal\Component\Utility\EmailValidatorInterface;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Site\Settings;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

/**
 * Read/write API for the decoupled storefront.
 *
 * GET endpoints expose only published/aggregated data and are public.
 * POST endpoints are called server-to-server from Next.js API routes and
 * authenticated with the shared secret header (never from the browser).
 */
class ApiController extends ControllerBase {

  private const REVIEW_STATUS_PUBLISHED = 'published';

  /**
   * Validates the shared server secret on mutating requests.
   */
  private function checkSecret(Request $request): bool {
    $secret = Settings::get('smartgrids_checkout_secret');
    return $secret && hash_equals((string) $secret, (string) $request->headers->get('x-storefront-secret', ''));
  }

  /**
   * GET /api/storefront/rates — currencies + server-side exchange rates.
   */
  public function rates(): JsonResponse {
    return new JsonResponse(\Drupal::service('smartgrids_storefront.rates')->payload());
  }

  /**
   * GET /api/storefront/stats — aggregated per-product statistics keyed by
   * product UUID, plus admin display configuration. One request serves
   * every card on a page; no per-card API calls.
   */
  public function stats(Request $request): JsonResponse {
    $db = \Drupal::database();
    $config = $this->config('smartgrids_storefront.settings');
    $stats = [];

    // Optional date-range filtering for purchase counts (admin reports).
    $from = (int) $request->query->get('from', 0);
    $to = (int) $request->query->get('to', 0);
    $range = '';
    $args = [];
    if ($from) {
      $range .= ' AND sp.created >= :from';
      $args[':from'] = $from;
    }
    if ($to) {
      $range .= ' AND sp.created <= :to';
      $args[':to'] = $to;
    }

    foreach ($db->query(
      "SELECT p.uuid, SUM(sp.quantity) AS units, COUNT(DISTINCT sp.order_id) AS orders
       FROM {smartgrids_purchase} sp
       JOIN {commerce_product} p ON p.product_id = sp.product_id
       WHERE 1=1 {$range} GROUP BY p.uuid", $args) as $row) {
      $stats[$row->uuid]['purchases'] = (int) $row->units;
      $stats[$row->uuid]['orders'] = (int) $row->orders;
    }

    foreach ($db->query(
      "SELECT p.uuid, COUNT(*) AS total, COUNT(DISTINCT d.order_id) AS unique_downloads
       FROM {smartgrids_download} d
       JOIN {commerce_product} p ON p.product_id = d.product_id
       GROUP BY p.uuid") as $row) {
      $stats[$row->uuid]['downloads'] = (int) $row->total;
      $stats[$row->uuid]['unique_downloads'] = (int) $row->unique_downloads;
    }

    foreach ($db->query(
      "SELECT product_uuid, rating, COUNT(*) AS cnt, SUM(verified) AS verified
       FROM {smartgrids_review} WHERE status = :s GROUP BY product_uuid, rating",
      [':s' => self::REVIEW_STATUS_PUBLISHED]) as $row) {
      $bucket = &$stats[$row->product_uuid];
      $bucket['rating_distribution'][(int) $row->rating] = (int) $row->cnt;
      $bucket['review_count'] = ($bucket['review_count'] ?? 0) + (int) $row->cnt;
      $bucket['verified_count'] = ($bucket['verified_count'] ?? 0) + (int) $row->verified;
      $bucket['rating_sum'] = ($bucket['rating_sum'] ?? 0) + (int) $row->rating * (int) $row->cnt;
    }
    foreach ($stats as &$bucket) {
      if (!empty($bucket['review_count'])) {
        $bucket['rating_avg'] = round($bucket['rating_sum'] / $bucket['review_count'], 1);
        unset($bucket['rating_sum']);
      }
    }

    return new JsonResponse([
      'stats' => $stats,
      'meta' => [
        'show_purchase_count' => (bool) $config->get('show_purchase_count'),
        'show_download_count' => (bool) $config->get('show_download_count'),
        'show_ratings' => (bool) $config->get('show_ratings'),
        'purchase_label' => (string) $config->get('purchase_label'),
        'download_label' => (string) $config->get('download_label'),
      ],
    ]);
  }

  /**
   * GET /api/storefront/catalog — server-side catalogue query.
   *
   * One SQL query handles filtering (category, on-sale, search), ALL sort
   * orders (including statistic-driven ones JSON:API cannot express) and
   * pagination, returning ordered product UUIDs + a total. The storefront
   * then loads full product data for one page of UUIDs via JSON:API.
   *
   * Sorting correctness:
   * - price sorts use MIN(variation price) as DECIMAL — never strings,
   * - date sorts use integer timestamps,
   * - stat sorts LEFT JOIN the ledgers with COALESCE(0), so products with
   *   no sales/reviews/downloads sort last instead of breaking the query,
   * - unknown sort keys fall back to "newest" (safe default).
   */
  public function catalog(Request $request): JsonResponse {
    $db = \Drupal::database();
    $limit = min(50, max(1, (int) $request->query->get('limit', 24)));
    $offset = max(0, (int) $request->query->get('offset', 0));
    $sort = (string) $request->query->get('sort', 'newest');
    $q = trim((string) $request->query->get('q', ''));
    $category = trim((string) $request->query->get('category', ''));
    $on_sale = $request->query->get('on_sale') === '1';

    $args = [];
    $where = 'f.status = 1';
    if ($category !== '') {
      $where .= ' AND EXISTS (SELECT 1 FROM {commerce_product__field_store_category} c
        WHERE c.entity_id = f.product_id AND c.field_store_category_value = :category)';
      $args[':category'] = $category;
    }
    if ($on_sale) {
      $where .= ' AND EXISTS (SELECT 1 FROM {commerce_product_variation_field_data} sv
        WHERE sv.product_id = f.product_id AND sv.list_price__number IS NOT NULL)';
    }
    if ($q !== '') {
      $where .= ' AND f.title LIKE :q';
      $args[':q'] = '%' . $db->escapeLike($q) . '%';
      $args[':qstart'] = $db->escapeLike($q) . '%';
    }

    // Whitelisted ORDER BY clauses — the only place sort input is used.
    $orders = [
      'newest' => 'f.created DESC',
      'oldest' => 'f.created ASC',
      'updated' => 'f.changed DESC',
      'price_asc' => 'min_price ASC, f.title ASC',
      'price_desc' => 'min_price DESC, f.title ASC',
      'rating_desc' => 'rating_avg DESC, review_count DESC, f.created DESC',
      'reviews_desc' => 'review_count DESC, rating_avg DESC, f.created DESC',
      'purchases_desc' => 'units DESC, f.created DESC',
      'downloads_desc' => 'downloads DESC, f.created DESC',
      'popular' => 'popularity DESC, f.created DESC',
      'title_asc' => 'f.title ASC',
      'title_desc' => 'f.title DESC',
      // Relevance: with a search term, prefix matches rank first; without
      // one it means overall popularity.
      'relevance' => $q !== ''
        ? 'CASE WHEN f.title LIKE :qstart THEN 0 ELSE 1 END ASC, f.title ASC'
        : 'popularity DESC, f.created DESC',
    ];
    if (!isset($orders[$sort])) {
      $sort = 'newest';
    }
    if ($sort !== 'relevance' && isset($args[':qstart'])) {
      unset($args[':qstart']);
    }

    $select =
      "SELECT p.uuid, f.title, f.created,
        COALESCE(pr.min_price, 0) AS min_price,
        COALESCE(rv.rating_avg, 0) AS rating_avg,
        COALESCE(rv.review_count, 0) AS review_count,
        COALESCE(pu.units, 0) AS units,
        COALESCE(dl.downloads, 0) AS downloads,
        (COALESCE(pu.units, 0) * 3 + COALESCE(rv.review_count, 0) * 2
          + COALESCE(dl.downloads, 0) + COALESCE(rv.rating_avg, 0)) AS popularity
      FROM {commerce_product_field_data} f
      JOIN {commerce_product} p ON p.product_id = f.product_id
      LEFT JOIN (SELECT product_id, MIN(CAST(price__number AS DECIMAL(19,6))) AS min_price
        FROM {commerce_product_variation_field_data} GROUP BY product_id) pr
        ON pr.product_id = f.product_id
      LEFT JOIN (SELECT product_id, AVG(rating) AS rating_avg, COUNT(*) AS review_count
        FROM {smartgrids_review} WHERE status = 'published' GROUP BY product_id) rv
        ON rv.product_id = f.product_id
      LEFT JOIN (SELECT product_id, SUM(quantity) AS units
        FROM {smartgrids_purchase} GROUP BY product_id) pu
        ON pu.product_id = f.product_id
      LEFT JOIN (SELECT product_id, COUNT(*) AS downloads
        FROM {smartgrids_download} GROUP BY product_id) dl
        ON dl.product_id = f.product_id
      WHERE {$where}
      ORDER BY {$orders[$sort]}";

    $count_args = array_diff_key($args, [':qstart' => 1]);
    $total = (int) $db->query(
      "SELECT COUNT(*) FROM {commerce_product_field_data} f WHERE {$where}",
      $count_args
    )->fetchField();
    $uuids = $db->queryRange($select, $offset, $limit, $args)->fetchCol();

    return new JsonResponse([
      'uuids' => $uuids,
      'total' => $total,
      'sort' => $sort,
      'limit' => $limit,
      'offset' => $offset,
    ]);
  }

  /**
   * GET /api/storefront/collections/{key} — ordered product UUIDs for
   * stat-driven sections (admins reference these keys from section nodes).
   */
  public function collection(string $key, Request $request): JsonResponse {
    $limit = min(50, max(1, (int) $request->query->get('limit', 12)));
    $db = \Drupal::database();

    $queries = [
      'best_sellers' =>
        "SELECT p.uuid, SUM(sp.quantity) AS score FROM {smartgrids_purchase} sp
         JOIN {commerce_product} p ON p.product_id = sp.product_id
         JOIN {commerce_product_field_data} f ON f.product_id = p.product_id AND f.status = 1
         GROUP BY p.uuid ORDER BY score DESC",
      'most_downloaded' =>
        "SELECT p.uuid, COUNT(*) AS score FROM {smartgrids_download} d
         JOIN {commerce_product} p ON p.product_id = d.product_id
         JOIN {commerce_product_field_data} f ON f.product_id = p.product_id AND f.status = 1
         GROUP BY p.uuid ORDER BY score DESC",
      'highest_rated' =>
        "SELECT r.product_uuid AS uuid, AVG(r.rating) AS score FROM {smartgrids_review} r
         WHERE r.status = 'published'
         GROUP BY r.product_uuid ORDER BY score DESC, COUNT(*) DESC",
      'most_reviewed' =>
        "SELECT r.product_uuid AS uuid, COUNT(*) AS score FROM {smartgrids_review} r
         WHERE r.status = 'published'
         GROUP BY r.product_uuid ORDER BY score DESC",
    ];

    if (!isset($queries[$key])) {
      return new JsonResponse(['message' => 'Unknown collection'], 404);
    }
    $uuids = $db->queryRange($queries[$key], 0, $limit)->fetchCol();
    return new JsonResponse(['collection' => $key, 'uuids' => $uuids]);
  }

  /**
   * GET /api/storefront/reviews/{product} — published reviews for a product.
   */
  public function reviews(string $product, Request $request): JsonResponse {
    $limit = min(100, max(1, (int) $request->query->get('limit', 50)));
    $offset = max(0, (int) $request->query->get('offset', 0));
    $db = \Drupal::database();

    $rows = $db->queryRange(
      "SELECT uuid, author, rating, title, body, verified, helpful, not_helpful, reply, created
       FROM {smartgrids_review}
       WHERE product_uuid = :p AND status = 'published'
       ORDER BY created DESC", $offset, $limit, [':p' => $product]
    )->fetchAll();

    $total = (int) $db->query(
      "SELECT COUNT(*) FROM {smartgrids_review} WHERE product_uuid = :p AND status = 'published'",
      [':p' => $product]
    )->fetchField();

    return new JsonResponse([
      'total' => $total,
      'reviews' => array_map(static fn($r) => [
        'id' => $r->uuid,
        'author' => $r->author,
        'rating' => (int) $r->rating,
        'title' => $r->title,
        'body' => $r->body,
        'verified' => (bool) $r->verified,
        'helpful' => (int) $r->helpful,
        'not_helpful' => (int) $r->not_helpful,
        'reply' => $r->reply ?: NULL,
        'created' => (int) $r->created,
      ], $rows),
    ]);
  }

  /**
   * POST /api/storefront/reviews — submit (or update) a review.
   */
  public function submitReview(Request $request, EmailValidatorInterface $email_validator = NULL): JsonResponse {
    if (!$this->checkSecret($request)) {
      return new JsonResponse(['message' => 'Unauthorized'], 401);
    }
    $config = $this->config('smartgrids_storefront.settings');
    $data = json_decode($request->getContent(), TRUE) ?: [];

    // Honeypot: bots fill every field; humans never see this one.
    if (!empty($data['website'])) {
      return new JsonResponse(['message' => 'Rejected'], 422);
    }

    $product_uuid = (string) ($data['product'] ?? '');
    $rating = (int) ($data['rating'] ?? 0);
    $author = trim(strip_tags((string) ($data['author'] ?? '')));
    $email = trim((string) ($data['email'] ?? ''));
    $title = mb_substr(trim(strip_tags((string) ($data['title'] ?? ''))), 0, 120);
    $body = mb_substr(trim(strip_tags((string) ($data['body'] ?? ''))), 0, 5000);

    if ($rating < 1 || $rating > 5) {
      return new JsonResponse(['message' => 'Rating must be between 1 and 5'], 422);
    }
    if ($author === '' || $body === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      return new JsonResponse(['message' => 'Name, valid email and review text are required'], 422);
    }
    if (!$config->get('allow_guest_reviews')) {
      return new JsonResponse(['message' => 'Guest reviews are disabled'], 403);
    }

    // Flood protection: 5 review submissions per hour per client IP.
    $flood = \Drupal::flood();
    $ip = (string) ($data['client_ip'] ?? $request->getClientIp());
    if (!$flood->isAllowed('smartgrids_review', 5, 3600, $ip)) {
      return new JsonResponse(['message' => 'Too many reviews — try again later'], 429);
    }

    // Resolve the product.
    $products = $this->entityTypeManager()->getStorage('commerce_product')
      ->loadByProperties(['uuid' => $product_uuid, 'status' => 1]);
    $product_entity = reset($products);
    if (!$product_entity) {
      return new JsonResponse(['message' => 'Unknown product'], 404);
    }

    // Verified purchase: this email completed an order containing the product.
    $db = \Drupal::database();
    $verified = (bool) $db->query(
      "SELECT 1 FROM {commerce_order} o
       JOIN {smartgrids_purchase} sp ON sp.order_id = o.order_id
       WHERE o.mail = :mail AND sp.product_id = :pid LIMIT 1",
      [':mail' => $email, ':pid' => $product_entity->id()]
    )->fetchField();

    if ($config->get('reviews_require_purchase') && !$verified) {
      return new JsonResponse(['message' => 'Only verified purchasers can review this product'], 403);
    }

    $now = \Drupal::time()->getRequestTime();
    $status = $config->get('auto_publish_reviews') ? 'published' : 'pending';

    // One review per email per product — resubmission edits in place and
    // goes back through moderation.
    $db->merge('smartgrids_review')
      ->keys(['product_id' => (int) $product_entity->id(), 'email' => $email])
      ->insertFields([
        'uuid' => \Drupal::service('uuid')->generate(),
        'product_id' => (int) $product_entity->id(),
        'product_uuid' => $product_uuid,
        'email' => $email,
        'created' => $now,
      ])
      ->updateFields(['status' => $status])
      ->fields([
        'author' => mb_substr($author, 0, 64),
        'rating' => $rating,
        'title' => $title,
        'body' => $body,
        'status' => $status,
        'verified' => (int) $verified,
        'ip' => mb_substr($ip, 0, 45),
        'changed' => $now,
      ])
      ->execute();

    $flood->register('smartgrids_review', 3600, $ip);

    if ($status === 'published' && function_exists('smartgrids_revalidate_send')) {
      smartgrids_revalidate_send(['stats', 'reviews', 'products'], []);
    }

    return new JsonResponse(['status' => $status, 'verified' => $verified], 201);
  }

  /**
   * POST /api/storefront/reviews/vote — helpful / not-helpful voting.
   */
  public function voteReview(Request $request): JsonResponse {
    if (!$this->checkSecret($request)) {
      return new JsonResponse(['message' => 'Unauthorized'], 401);
    }
    $data = json_decode($request->getContent(), TRUE) ?: [];
    $review = (string) ($data['review'] ?? '');
    $vote = ($data['vote'] ?? '') === 'helpful' ? 'helpful' : 'not_helpful';

    $flood = \Drupal::flood();
    $ip = (string) ($data['client_ip'] ?? $request->getClientIp());
    // One vote per review per IP (24h) + a global rate cap.
    if (!$flood->isAllowed("smartgrids_vote_{$review}", 1, 86400, $ip)
      || !$flood->isAllowed('smartgrids_vote', 30, 3600, $ip)) {
      return new JsonResponse(['message' => 'Already voted'], 429);
    }

    $updated = \Drupal::database()->update('smartgrids_review')
      ->expression($vote, "{$vote} + 1")
      ->condition('uuid', $review)
      ->condition('status', 'published')
      ->execute();
    if (!$updated) {
      return new JsonResponse(['message' => 'Unknown review'], 404);
    }
    $flood->register("smartgrids_vote_{$review}", 86400, $ip);
    $flood->register('smartgrids_vote', 3600, $ip);
    if (function_exists('smartgrids_revalidate_send')) {
      smartgrids_revalidate_send(['reviews'], []);
    }
    return new JsonResponse(['ok' => TRUE]);
  }

  /**
   * GET /api/storefront/notifications — broadcast notifications (uid 0).
   *
   * Per-user notifications (orders, replies) use the same table with a
   * real uid and activate once frontend authentication (e.g. OAuth) is in
   * place; the endpoint only ever serves uid-0 rows to anonymous callers,
   * so no user can read another user's notifications.
   */
  public function notifications(Request $request): JsonResponse {
    $limit = min(50, max(1, (int) $request->query->get('limit', 20)));
    $rows = \Drupal::database()->queryRange(
      "SELECT uuid, type, title, body, url, product_uuid, created
       FROM {smartgrids_notification} WHERE uid = 0 ORDER BY created DESC", 0, $limit
    )->fetchAll();

    return new JsonResponse([
      'notifications' => array_map(static fn($n) => [
        'id' => $n->uuid,
        'type' => $n->type,
        'title' => $n->title,
        'body' => $n->body ?: NULL,
        'url' => $n->url ?: NULL,
        'product' => $n->product_uuid ?: NULL,
        'created' => (int) $n->created,
      ], $rows),
    ]);
  }

}
