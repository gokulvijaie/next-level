/** Checkout data model shared by the form, API route and Drupal contract. */

export type ShippingAddress = {
  given_name: string;
  family_name: string;
  address_line1: string;
  address_line2: string;
  locality: string;
  administrative_area: string;
  postal_code: string;
  country_code: string;
};

export type ShippingMethod = {
  id: string;
  label: string;
  amount: number;
  description: string;
};

export type PaymentMethodId = "cod" | "card";

export type CheckoutPayload = {
  email: string;
  items: { variation_id: number; quantity: number }[];
  shipping_address: ShippingAddress;
  shipping_method: { label: string; amount: string };
  payment_method: PaymentMethodId;
};

export type OrderResult = {
  order_id: number;
  order_number: string;
  email: string;
  total: string;
  currency: string;
  state: string;
  payment_method: PaymentMethodId;
  items?: {
    variation_id: number;
    title: string;
    quantity: number;
    downloadable: boolean;
  }[];
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  { id: "standard", label: "Standard", amount: 0, description: "3–5 business days · Free" },
  { id: "express", label: "Express", amount: 9.99, description: "1–2 business days" },
];

/** Common country options; extend as needed or drive from Drupal config. */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "IN", name: "India" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
];
