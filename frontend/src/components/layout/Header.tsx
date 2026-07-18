"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, Loader2, Mic, Search, ShoppingCart, UserRound } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "@/components/layout/CurrencySelector";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-card">
      <div className="container grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3 md:gap-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <rect x="3" y="3" width="8" height="8" rx="2" />
              <rect x="13" y="3" width="8" height="8" rx="2" opacity=".7" />
              <rect x="3" y="13" width="8" height="8" rx="2" opacity=".7" />
              <rect x="13" y="13" width="8" height="8" rx="2" opacity=".4" />
            </svg>
          </span>
          <span className="hidden sm:inline">SmartGrids</span>
        </Link>

        <React.Suspense fallback={<div className="h-11" />}>
          <SearchBar />
        </React.Suspense>

        <div className="flex items-center gap-1">
          <CurrencySelector />
          <div className="hidden min-[360px]:block">
            <NotificationBell />
          </div>
          <WishlistLink />
          <a
            href={`${process.env.NEXT_PUBLIC_DRUPAL_BASE_URL ?? ""}/user`}
            aria-label="Your account"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground md:inline-flex"
          >
            <UserRound className="h-5 w-5" aria-hidden />
          </a>
          <CartLink />
        </div>
      </div>
    </header>
  );
}

function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = React.useState(params.get("q") ?? "");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const search = React.useCallback(
    (value: string) => {
      const normalized = value.trim();
      router.push(normalized ? `/shop?q=${encodeURIComponent(normalized)}` : "/shop");
    },
    [router],
  );

  const {
    supported: voiceSupported,
    state: voiceState,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
    reset: resetVoice,
  } = useVoiceSearch({
    onInterim: setQuery,
    onTranscript: (transcript) => {
      setQuery(transcript);
      search(transcript);
    },
  });

  React.useEffect(() => {
    setQuery(params.get("q") ?? "");
    if (params.get("focus") === "search") inputRef.current?.focus();
    resetVoice();
  }, [params, resetVoice]);

  const voiceLabel =
    voiceState === "listening"
      ? "Stop listening"
      : voiceSupported === false
        ? "Voice search is not supported in this browser"
        : "Search by voice";

  return (
    <form
      role="search"
      className="relative mx-auto flex min-w-0 w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault();
        stopVoice();
        search(query);
      }}
    >
      <label htmlFor="site-search" className="sr-only">
        Search products
      </label>
      <div className="relative min-w-0 flex-1">
        <Input
          ref={inputRef}
          id="site-search"
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(event) => {
            resetVoice();
            setQuery(event.target.value);
          }}
          className={cn(
            "rounded-r-none border-r-0 pr-11",
            voiceState === "listening" && "ring-2 ring-destructive",
          )}
        />
        <button
          type="button"
          disabled={voiceSupported !== true || voiceState === "processing"}
          onClick={voiceState === "listening" ? stopVoice : startVoice}
          aria-label={voiceLabel}
          title={voiceLabel}
          className={cn(
            "absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
            voiceState === "listening" && "animate-pulse bg-destructive text-white hover:bg-destructive hover:text-white",
          )}
        >
          {voiceState === "processing" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Mic className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      <Button type="submit" variant="brand" className="rounded-l-none" aria-label="Search">
        <Search className="h-5 w-5" aria-hidden />
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {voiceState === "listening"
          ? "Listening for a product search"
          : voiceState === "processing"
            ? `Searching for ${query}`
            : ""}
      </span>
      {voiceError && (
        <p
          role="alert"
          className="absolute left-0 top-[calc(100%+0.5rem)] z-50 max-w-sm rounded-lg bg-card px-3 py-2 text-xs font-semibold text-destructive shadow-card"
        >
          {voiceError}
        </p>
      )}
    </form>
  );
}

function CartLink() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="relative inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 font-semibold transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground"
    >
      <ShoppingCart className="h-5 w-5" aria-hidden />
      <span className="hidden md:inline">Cart</span>
      <span className="sr-only">, {count} items</span>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold text-white"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function WishlistLink() {
  const { items } = useWishlist();
  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist, ${items.length} items`}
      className="relative hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground md:inline-flex"
    >
      <Heart className="h-5 w-5" aria-hidden />
      {items.length > 0 && (
        <span
          aria-hidden
          className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold text-white"
        >
          {items.length}
        </span>
      )}
    </Link>
  );
}
