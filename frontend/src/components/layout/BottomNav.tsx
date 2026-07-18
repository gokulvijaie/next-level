"use client";

/** Native-app style bottom tab bar; mobile only, iOS safe-area aware. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, Search, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/providers/CartProvider";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Categories", icon: LayoutGrid },
  { href: "/shop?focus=search", label: "Search", icon: Search },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { count } = useCart();

  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-flow-col bg-primary pb-[env(safe-area-inset-bottom)] text-primary-foreground shadow-card-hover md:hidden"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const base = href.split("?")[0];
        const active =
          base === "/" ? pathname === "/" : pathname.startsWith(base) && !href.includes("focus");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-semibold transition-transform active:scale-95",
              active ? "text-brand" : "text-white/70",
            )}
          >
            {/* Yellow active pill behind the icon, per the design language. */}
            <span
              className={cn(
                "grid h-7 w-12 place-items-center rounded-full transition-colors",
                active ? "bg-brand text-brand-foreground" : "bg-white/10",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.2 : 1.8} />
            </span>
            {label}
            {href === "/cart" && count > 0 && (
              <span
                aria-hidden
                className="absolute right-[calc(50%-1.5rem)] top-1.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-destructive px-1 text-[0.6875rem] font-bold text-white"
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
