"use client";

/**
 * Frontend checkout. Collects contact + shipping address, delivery method
 * and payment method, shows a live order summary, and places the order via
 * POST /api/checkout (which forwards to Drupal Commerce). On success the
 * cart is cleared and the shopper is sent to the confirmation page.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/providers/CartProvider";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";
import {
  COUNTRIES,
  SHIPPING_METHODS,
  type PaymentMethodId,
  type ShippingAddress,
} from "@/types/checkout";
import { cn } from "@/lib/utils";

type FormErrors = Partial<Record<keyof ShippingAddress | "email", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const { format, base, currency: displayCurrency } = useCurrency();

  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState<ShippingAddress>({
    given_name: "",
    family_name: "",
    address_line1: "",
    address_line2: "",
    locality: "",
    administrative_area: "",
    postal_code: "",
    country_code: "US",
  });
  const [shippingId, setShippingId] = React.useState(SHIPPING_METHODS[0].id);
  const [payment, setPayment] = React.useState<PaymentMethodId>("cod");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const currency = items[0]?.currency ?? "USD";
  const shipping = SHIPPING_METHODS.find((m) => m.id === shippingId) ?? SHIPPING_METHODS[0];
  const total = subtotal + shipping.amount;

  const setField = (key: keyof ShippingAddress, value: string) =>
    setAddress((prev) => ({ ...prev, [key]: value }));

  function validate(): boolean {
    const next: FormErrors = {};
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    const required: (keyof ShippingAddress)[] = [
      "given_name",
      "family_name",
      "address_line1",
      "locality",
      "postal_code",
      "country_code",
    ];
    for (const key of required) {
      if (!address[key].trim()) next[key] = "This field is required.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);
    if (!validate()) {
      // Focus the first invalid field for keyboard/AT users.
      const firstError = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstError?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: items.map((i) => ({ variation_id: i.variationId, quantity: i.quantity })),
          shipping_address: address,
          shipping_method: { label: shipping.label, amount: shipping.amount.toFixed(2) },
          payment_method: payment,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setServerError(data.message ?? "Something went wrong placing your order.");
        setSubmitting(false);
        return;
      }
      // Stash the order for the confirmation page, then clear the cart.
      sessionStorage.setItem("smartgrids_last_order", JSON.stringify(data.order));
      clear();
      router.push("/checkout/success");
    } catch {
      setServerError("Could not reach the store. Please try again.");
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container grid place-items-center gap-4 py-24 text-center">
        <span className="text-5xl" aria-hidden>
          🧾
        </span>
        <h1 className="text-2xl font-extrabold">Your cart is empty</h1>
        <p className="text-muted-foreground">Add something to your cart before checking out.</p>
        <Link href="/shop" className={buttonVariants({ size: "lg" })}>
          Go to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          {serverError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {serverError}
            </p>
          )}

          {/* 1. Contact */}
          <Section step={1} title="Contact">
            <Field id="email" label="Email address" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                placeholder="you@example.com"
              />
            </Field>
          </Section>

          {/* 2. Shipping address */}
          <Section step={2} title="Shipping address">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="given_name" label="First name" error={errors.given_name}>
                <Input
                  id="given_name"
                  autoComplete="given-name"
                  value={address.given_name}
                  onChange={(e) => setField("given_name", e.target.value)}
                  aria-invalid={Boolean(errors.given_name)}
                />
              </Field>
              <Field id="family_name" label="Last name" error={errors.family_name}>
                <Input
                  id="family_name"
                  autoComplete="family-name"
                  value={address.family_name}
                  onChange={(e) => setField("family_name", e.target.value)}
                  aria-invalid={Boolean(errors.family_name)}
                />
              </Field>
              <Field id="address_line1" label="Address" error={errors.address_line1} className="sm:col-span-2">
                <Input
                  id="address_line1"
                  autoComplete="address-line1"
                  value={address.address_line1}
                  onChange={(e) => setField("address_line1", e.target.value)}
                  aria-invalid={Boolean(errors.address_line1)}
                />
              </Field>
              <Field id="address_line2" label="Apartment, suite (optional)" className="sm:col-span-2">
                <Input
                  id="address_line2"
                  autoComplete="address-line2"
                  value={address.address_line2}
                  onChange={(e) => setField("address_line2", e.target.value)}
                />
              </Field>
              <Field id="locality" label="City" error={errors.locality}>
                <Input
                  id="locality"
                  autoComplete="address-level2"
                  value={address.locality}
                  onChange={(e) => setField("locality", e.target.value)}
                  aria-invalid={Boolean(errors.locality)}
                />
              </Field>
              <Field id="administrative_area" label="State / Province (optional)">
                <Input
                  id="administrative_area"
                  autoComplete="address-level1"
                  value={address.administrative_area}
                  onChange={(e) => setField("administrative_area", e.target.value)}
                />
              </Field>
              <Field id="postal_code" label="Postal code" error={errors.postal_code}>
                <Input
                  id="postal_code"
                  autoComplete="postal-code"
                  value={address.postal_code}
                  onChange={(e) => setField("postal_code", e.target.value)}
                  aria-invalid={Boolean(errors.postal_code)}
                />
              </Field>
              <Field id="country_code" label="Country" error={errors.country_code}>
                <select
                  id="country_code"
                  autoComplete="country"
                  value={address.country_code}
                  onChange={(e) => setField("country_code", e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* 3. Delivery */}
          <Section step={3} title="Delivery method">
            <fieldset className="grid gap-3">
              <legend className="sr-only">Delivery method</legend>
              {SHIPPING_METHODS.map((method) => (
                <RadioRow
                  key={method.id}
                  name="shipping"
                  checked={shippingId === method.id}
                  onChange={() => setShippingId(method.id)}
                  title={method.label}
                  description={method.description}
                  aside={method.amount === 0 ? "Free" : format(method.amount, currency)}
                />
              ))}
            </fieldset>
          </Section>

          {/* 4. Payment */}
          <Section step={4} title="Payment">
            <fieldset className="grid gap-3">
              <legend className="sr-only">Payment method</legend>
              <RadioRow
                name="payment"
                checked={payment === "cod"}
                onChange={() => setPayment("cod")}
                title="Cash on delivery"
                description="Pay when your order arrives."
              />
              <RadioRow
                name="payment"
                checked={payment === "card"}
                onChange={() => setPayment("card")}
                title="Credit / debit card"
                description="Card is captured securely at the next step."
              />
              {payment === "card" && (
                <div className="grid gap-4 rounded-md border border-dashed p-4 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    <ShieldCheck className="mr-1 inline h-4 w-4" aria-hidden />
                    Demo card fields — connect a Stripe/Commerce gateway to capture real payments.
                  </p>
                  <Field id="card_number" label="Card number" className="sm:col-span-2">
                    <Input id="card_number" inputMode="numeric" placeholder="4242 4242 4242 4242" autoComplete="cc-number" />
                  </Field>
                  <Field id="card_exp" label="Expiry">
                    <Input id="card_exp" placeholder="MM / YY" autoComplete="cc-exp" />
                  </Field>
                  <Field id="card_cvc" label="CVC">
                    <Input id="card_cvc" inputMode="numeric" placeholder="123" autoComplete="cc-csc" />
                  </Field>
                </div>
              )}
            </fieldset>
          </Section>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-24 h-fit rounded-lg bg-card p-5 shadow-card" aria-label="Order summary">
          <h2 className="text-lg font-bold">Order summary</h2>
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.variationId} className="flex items-center gap-3">
                <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.image ? (
                    <Image src={item.image} alt="" fill sizes="3rem" className="object-contain p-1" />
                  ) : (
                    <ProductImagePlaceholder />
                  )}
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground"
                  >
                    {item.quantity}
                  </span>
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                <span className="text-sm font-semibold">
                  {format((item.price ?? 0) * item.quantity, item.currency)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 grid gap-2 border-t pt-4 text-sm">
            <Row label="Subtotal" value={format(subtotal, currency)} />
            <Row
              label="Shipping"
              value={shipping.amount === 0 ? "Free" : format(shipping.amount, currency)}
            />
            <div className="mt-1 flex justify-between border-t pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd>{format(total, currency)}</dd>
            </div>
          </dl>

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
            <Lock className="h-4 w-4" aria-hidden />
            {submitting ? "Placing order…" : `Place order · ${format(total, currency)}`}
          </Button>
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Secure checkout
          </p>
          {displayCurrency !== base && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Prices shown in {displayCurrency} are indicative; your order is charged in {base}.
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-card p-5 shadow-card" aria-label={title}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-sm text-primary-foreground">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function RadioRow({
  name,
  checked,
  onChange,
  title,
  description,
  aside,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  aside?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors",
        checked ? "border-primary bg-primary/5" : "hover:bg-secondary",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[hsl(var(--primary))]"
      />
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      {aside && <span className="font-semibold">{aside}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
