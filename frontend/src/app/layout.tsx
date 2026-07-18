import type { Metadata, Viewport } from "next";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/providers/CartProvider";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { WishlistProvider } from "@/components/providers/WishlistProvider";
import { getRates } from "@/lib/services/storefront";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "SmartGrids — Shop smarter", template: "%s | SmartGrids" },
  description: "Premium shopping experience powered by Drupal Commerce and Next.js.",
  openGraph: { type: "website", siteName: "SmartGrids" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-side exchange rates from Drupal (cached, tag "rates").
  const rates = await getRates();

  return (
    <html lang="en">
      <body suppressHydrationWarning className="pb-bottom-nav md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <CurrencyProvider payload={rates}>
          <CartProvider>
            <WishlistProvider>
              <Header />
              <main id="main" tabIndex={-1}>
                {children}
              </main>
              <Footer />
              <BottomNav />
            </WishlistProvider>
          </CartProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
