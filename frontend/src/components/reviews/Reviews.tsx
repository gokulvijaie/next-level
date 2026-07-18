"use client";

/**
 * Product reviews UI: summary with rating distribution chart, sortable /
 * filterable review list, helpful voting, and a submission form with
 * honeypot. Initial data is server-rendered (passed as props from the PDP,
 * cached under the "reviews" tag); mutations go through the Next.js proxy
 * routes so the shared secret stays server-side. Drupal moderates
 * (pending → published) and re-verifies everything.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Loader2, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EASE, useMotionPrefs } from "@/lib/motion";
import type { ProductStats, Review } from "@/types/storefront";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

type SortKey = "newest" | "highest" | "lowest" | "helpful";

export function Reviews({
  product,
  initialReviews,
  stats,
}: {
  product: Product;
  initialReviews: Review[];
  stats: ProductStats | null;
}) {
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(5);

  const avg = stats?.rating_avg ?? null;
  const total = stats?.review_count ?? initialReviews.length;
  const distribution = stats?.rating_distribution ?? {};

  const sorted = React.useMemo(() => {
    const list = initialReviews.filter((r) => !verifiedOnly || r.verified);
    const by: Record<SortKey, (a: Review, b: Review) => number> = {
      newest: (a, b) => b.created - a.created,
      highest: (a, b) => b.rating - a.rating,
      lowest: (a, b) => a.rating - b.rating,
      helpful: (a, b) => b.helpful - a.helpful,
    };
    return [...list].sort(by[sort]);
  }, [initialReviews, sort, verifiedOnly]);

  return (
    <section aria-label="Customer reviews" className="mt-12">
      <h2 className="mb-4 text-xl font-extrabold tracking-tight">Customer reviews</h2>

      <div className="grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          {/* Summary + distribution */}
          <div className="rounded-lg bg-card p-5 shadow-card">
            {avg !== null ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">{avg.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">out of 5</span>
                </p>
                <Stars value={avg} className="mt-1" />
                <p className="mt-1 text-sm text-muted-foreground">
                  {avg.toFixed(1)} out of 5 from {total} review{total === 1 ? "" : "s"}
                  {stats?.verified_count ? ` · ${stats.verified_count} verified` : ""}
                </p>
                <dl className="mt-4 grid gap-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = distribution[String(star)] ?? 0;
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <dt className="w-8 whitespace-nowrap font-semibold">{star} ★</dt>
                        <dd className="flex flex-1 items-center gap-2">
                          <span
                            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                            role="img"
                            aria-label={`${count} ${star}-star reviews (${pct}%)`}
                          >
                            <span
                              className="block h-full rounded-full bg-amber-500 transition-[width] duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="w-8 text-right text-muted-foreground">{count}</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reviews yet — be the first to review this product.
              </p>
            )}
          </div>

          <ReviewForm product={product} />
        </div>

        {/* List */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="newest">Newest</option>
                <option value="highest">Highest rating</option>
                <option value="lowest">Lowest rating</option>
                <option value="helpful">Most helpful</option>
              </select>
            </label>
            <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Verified purchases only
            </label>
          </div>

          {sorted.length === 0 ? (
            <p className="rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">
              No reviews match this filter yet.
            </p>
          ) : (
            <ul className="grid gap-4">
              {sorted.slice(0, visibleCount).map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          )}

          {sorted.length > visibleCount && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setVisibleCount((c) => c + 5)}
            >
              Show more reviews ({sorted.length - visibleCount} remaining)
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("flex", className)} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i <= Math.round(value) ? "fill-amber-500 text-amber-500" : "text-border",
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const [votes, setVotes] = React.useState({ helpful: review.helpful, not_helpful: review.not_helpful });
  const [voted, setVoted] = React.useState(false);
  const date = new Date(review.created * 1000);

  const vote = async (kind: "helpful" | "not_helpful") => {
    if (voted) return;
    setVoted(true);
    setVotes((v) => ({ ...v, [kind]: v[kind] + 1 }));
    try {
      await fetch("/api/reviews/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: review.id, vote: kind === "helpful" ? "helpful" : "not_helpful" }),
      });
    } catch {
      /* optimistic UI; server flood control is authoritative */
    }
  };

  return (
    <li className="rounded-lg bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={review.rating} />
        {review.title && <h3 className="font-bold">{review.title}</h3>}
      </div>
      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{review.author}</span>
        <time dateTime={date.toISOString()}>{date.toLocaleDateString()}</time>
        {review.verified && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-1.5 py-0.5 font-semibold text-success">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified purchase
          </span>
        )}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm">{review.body}</p>

      {review.reply && (
        <div className="mt-3 rounded-md border-l-4 border-primary bg-secondary p-3 text-sm">
          <p className="font-bold">Response from the store</p>
          <p className="mt-1 whitespace-pre-line">{review.reply}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        Was this helpful?
        <button
          type="button"
          onClick={() => vote("helpful")}
          disabled={voted}
          className="inline-flex min-h-9 items-center gap-1 rounded-sm px-2 font-semibold hover:bg-secondary disabled:opacity-50"
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> Yes ({votes.helpful})
        </button>
        <button
          type="button"
          onClick={() => vote("not_helpful")}
          disabled={voted}
          className="inline-flex min-h-9 items-center gap-1 rounded-sm px-2 font-semibold hover:bg-secondary disabled:opacity-50"
        >
          <ThumbsDown className="h-3.5 w-3.5" aria-hidden /> No ({votes.not_helpful})
        </button>
      </div>
    </li>
  );
}

function ReviewForm({ product }: { product: Product }) {
  const prefs = useMotionPrefs();
  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);
  const [state, setState] = React.useState<"idle" | "submitting" | "published" | "pending" | "error">("idle");
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const author = String(form.get("author") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    if (!rating) {
      setError("Please choose a star rating.");
      return;
    }
    if (!author) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!body) {
      setError("Please write your review.");
      return;
    }
    setState("submitting");
    setError("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: product.id,
          rating,
          author,
          email,
          title,
          body,
          website: form.get("website"), // honeypot
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        status?: "published" | "pending";
      } | null;
      if (!response.ok) {
        setState("error");
        setError(data?.message ?? `Could not submit your review (${response.status}).`);
        return;
      }
      setState(data?.status === "published" ? "published" : "pending");
    } catch {
      setState("error");
      setError("Could not reach the store. Please try again.");
    }
  };

  if (state === "published" || state === "pending") {
    return (
      <motion.p
        initial={prefs.reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        role="status"
        className="rounded-lg bg-success/10 p-4 text-sm font-semibold text-success"
      >
        {state === "published"
          ? "Thanks! Your review has been published."
          : "Thanks! Your review has been submitted and is awaiting moderation."}
      </motion.p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={state === "submitting"}
      className="grid gap-3 rounded-lg bg-card p-5 shadow-card"
    >
      <h3 className="font-bold">Write a review</h3>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Your rating</legend>
        <div className="flex" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              aria-label={`Rate ${star} out of 5 stars`}
              aria-pressed={rating === star}
              className="grid h-11 w-11 place-items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  star <= (hovered || rating) ? "fill-amber-500 text-amber-500" : "text-border",
                )}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          Name
          <Input name="author" required maxLength={64} autoComplete="name" />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Email <span className="font-normal text-muted-foreground">(not published)</span>
          <Input name="email" type="email" required autoComplete="email" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">
        Title <span className="font-normal text-muted-foreground">(optional)</span>
        <Input name="title" maxLength={120} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Review
        <textarea
          name="body"
          required
          rows={4}
          maxLength={5000}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {/* Honeypot — hidden from humans, filled by bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && (
        <p role="alert" aria-live="assertive" className="rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {state === "submitting" ? "Submitting..." : "Submit review"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Reviews from verified purchasers are labelled. One review per person per product.
      </p>
    </form>
  );
}
