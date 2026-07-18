"use client";

/**
 * User currency selection.
 *
 * Rates and the currency list come from Drupal's server-side exchange-rate
 * service (fetched in the root layout, cached under the "rates" tag and
 * refreshed by cron + webhook). The browser only FORMATS prices with the
 * trusted rates it was given — it never invents them — and all
 * transactional amounts (cart handoff, orders) remain in the store's base
 * currency computed by Drupal.
 *
 * The choice persists in a cookie (1 year) so it survives visits, and
 * switching re-renders prices instantly with no page reload.
 */
import * as React from "react";
import type { RatesPayload } from "@/types/storefront";

const COOKIE = "sg_currency";

type CurrencyContextValue = {
  /** Active display currency code. */
  currency: string;
  /** Store base currency (transactions always settle in this). */
  base: string;
  /** Currencies the admin enabled AND that have a usable rate. */
  available: RatesPayload["currencies"];
  stale: boolean;
  setCurrency: (code: string) => void;
  /** Convert + format an amount from a source currency for display. */
  format: (amount: number | null, from: string) => string;
};

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({
  payload,
  children,
}: {
  payload: RatesPayload | null;
  children: React.ReactNode;
}) {
  const base = payload?.base ?? "USD";
  const rates = React.useMemo(() => payload?.rates ?? { [base]: 1 }, [payload, base]);
  const [currency, setCurrencyState] = React.useState(base);

  // Only offer currencies that actually have a rate (e.g. the rate feed
  // may not cover every enabled currency — never guess a rate).
  const available = React.useMemo(
    () => (payload?.currencies ?? []).filter((c) => rates[c.code] !== undefined),
    [payload, rates],
  );

  React.useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([A-Z]{3})`));
    if (match && rates[match[1]] !== undefined) {
      setCurrencyState(match[1]);
    }
  }, [rates]);

  const setCurrency = React.useCallback(
    (code: string) => {
      if (rates[code] === undefined) return;
      setCurrencyState(code);
      document.cookie = `${COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    },
    [rates],
  );

  const format = React.useCallback(
    (amount: number | null, from: string) => {
      if (amount === null) return "";
      const fromRate = rates[from];
      const toRate = rates[currency];
      // Missing rate on either side → show the original untouched.
      const target = fromRate && toRate ? currency : from;
      const value = fromRate && toRate ? (amount / fromRate) * toRate : amount;
      return new Intl.NumberFormat(undefined, { style: "currency", currency: target }).format(
        value,
      );
    },
    [rates, currency],
  );

  const value = React.useMemo(
    () => ({ currency, base, available, stale: payload?.stale ?? false, setCurrency, format }),
    [currency, base, available, payload, setCurrency, format],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}

/** Convenience component: converted, formatted price for display. */
export function DisplayPrice({
  amount,
  from,
  className,
}: {
  amount: number | null;
  from: string;
  className?: string;
}) {
  const { format } = useCurrency();
  return <span className={className}>{format(amount, from)}</span>;
}
