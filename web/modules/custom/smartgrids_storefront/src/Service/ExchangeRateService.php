<?php

namespace Drupal\smartgrids_storefront\Service;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Database\Connection;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use GuzzleHttp\ClientInterface;
use Psr\Log\LoggerInterface;

/**
 * Server-side exchange rates, relative to the store's base currency.
 *
 * Rates are fetched from a configurable API (default: frankfurter.app,
 * ECB data, no key required) on cron and stored in {smartgrids_rate}.
 * If the service is unreachable the last stored rates keep serving and
 * the API marks the payload as stale — the storefront never breaks and
 * never invents rates client-side.
 */
class ExchangeRateService {

  public function __construct(
    private readonly Connection $database,
    private readonly ClientInterface $httpClient,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly TimeInterface $time,
    private readonly LoggerInterface $logger,
  ) {}

  /**
   * The store's base currency code.
   */
  public function baseCurrency(): string {
    $store = $this->entityTypeManager->getStorage('commerce_store')->loadDefault();
    return $store ? $store->getDefaultCurrencyCode() : 'USD';
  }

  /**
   * Currencies enabled by the administrator (commerce_currency entities).
   */
  public function enabledCurrencies(): array {
    $currencies = [];
    foreach ($this->entityTypeManager->getStorage('commerce_currency')->loadMultiple() as $currency) {
      /** @var \Drupal\commerce_price\Entity\CurrencyInterface $currency */
      $currencies[] = [
        'code' => $currency->getCurrencyCode(),
        'name' => $currency->getName(),
        'symbol' => $currency->getSymbol(),
        'fraction_digits' => $currency->getFractionDigits(),
      ];
    }
    return $currencies;
  }

  /**
   * Fetches fresh rates for every enabled currency. Failure keeps old rates.
   */
  public function refresh(): bool {
    $base = $this->baseCurrency();
    $codes = array_column($this->enabledCurrencies(), 'code');
    $targets = array_values(array_diff($codes, [$base]));
    if (!$targets) {
      return TRUE;
    }

    $api = $this->configFactory->get('smartgrids_storefront.settings')->get('rates_api');
    try {
      $response = $this->httpClient->request('GET', $api, [
        'query' => ['from' => $base, 'to' => implode(',', $targets)],
        'timeout' => 10,
      ]);
      $data = json_decode((string) $response->getBody(), TRUE);
      if (!is_array($data['rates'] ?? NULL)) {
        throw new \RuntimeException('Malformed rates payload');
      }
    }
    catch (\Throwable $e) {
      $this->logger->warning('Exchange-rate refresh failed (@m); keeping stored rates.', ['@m' => $e->getMessage()]);
      return FALSE;
    }

    $now = $this->time->getRequestTime();
    $this->database->merge('smartgrids_rate')
      ->key('currency', $base)
      ->fields(['rate' => 1, 'updated' => $now])
      ->execute();
    foreach ($data['rates'] as $code => $rate) {
      if (is_numeric($rate) && $rate > 0) {
        $this->database->merge('smartgrids_rate')
          ->key('currency', (string) $code)
          ->fields(['rate' => (string) $rate, 'updated' => $now])
          ->execute();
      }
    }

    if (function_exists('smartgrids_revalidate_send')) {
      smartgrids_revalidate_send(['rates'], []);
    }
    return TRUE;
  }

  /**
   * The full rates payload served to the storefront.
   */
  public function payload(): array {
    $rows = $this->database->select('smartgrids_rate', 'r')
      ->fields('r')->execute()->fetchAllAssoc('currency');
    $rates = [];
    $oldest = $this->time->getRequestTime();
    foreach ($rows as $code => $row) {
      $rates[$code] = (float) $row->rate;
      $oldest = min($oldest, (int) $row->updated);
    }
    $interval = (int) $this->configFactory->get('smartgrids_storefront.settings')->get('rates_refresh_seconds') ?: 21600;

    return [
      'base' => $this->baseCurrency(),
      'rates' => $rates,
      'currencies' => $this->enabledCurrencies(),
      'updated' => $oldest,
      // Stale = older than two refresh intervals; the UI can badge this.
      'stale' => ($this->time->getRequestTime() - $oldest) > 2 * $interval,
    ];
  }

}
