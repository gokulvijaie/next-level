/** Types for the Drupal storefront API (stats, reviews, notifications, rates). */

export type ProductStats = {
  purchases?: number;
  orders?: number;
  downloads?: number;
  unique_downloads?: number;
  rating_avg?: number;
  review_count?: number;
  verified_count?: number;
  rating_distribution?: Record<string, number>;
};

export type StatsMeta = {
  show_purchase_count: boolean;
  show_download_count: boolean;
  show_ratings: boolean;
  purchase_label: string;
  download_label: string;
};

export type StatsPayload = { stats: Record<string, ProductStats>; meta: StatsMeta };

export type Review = {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  not_helpful: number;
  reply: string | null;
  created: number;
};

export type ReviewsPayload = { total: number; reviews: Review[] };

export type StoreNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  product: string | null;
  created: number;
};

export type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  fraction_digits: number;
};

export type RatesPayload = {
  base: string;
  rates: Record<string, number>;
  currencies: CurrencyInfo[];
  updated: number;
  stale: boolean;
};

export type CollectionKey =
  | "best_sellers"
  | "most_downloaded"
  | "highest_rated"
  | "most_reviewed";
