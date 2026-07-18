"use client";

/**
 * Currency selector — header component, works on desktop and mobile.
 * Options come from Drupal's enabled currencies (admin-managed at
 * /admin/commerce/config/currencies); nothing is hard-coded.
 */
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { cn } from "@/lib/utils";

export function CurrencySelector({ className }: { className?: string }) {
  const { currency, available, setCurrency, stale } = useCurrency();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const listId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (available.length < 2) return null;

  const selected = available.find((item) => item.code === currency) ?? available[0];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Display currency: ${currency}`}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={stale ? "Exchange rates may be out of date" : undefined}
        className="inline-flex h-11 min-w-[5.5rem] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-3 text-sm font-semibold text-primary-foreground transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span>{selected.symbol} {selected.code}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Display currency"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-44 overflow-hidden rounded-xl border border-white/15 bg-primary p-1.5 text-primary-foreground shadow-card-hover"
        >
          {available.map((item) => {
            const active = item.code === currency;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setCurrency(item.code);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors",
                  active ? "bg-brand text-brand-foreground" : "hover:bg-white/10",
                )}
              >
                <span>{item.symbol} {item.code}</span>
                {active && <Check className="h-4 w-4" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
