import Link from "next/link";

const columns: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Shop",
    links: [
      { href: "/shop", label: "All products" },
      { href: "/shop?filter=sale", label: "Deals" },
      { href: "/shop?filter=featured", label: "Featured" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/cart", label: "Cart" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="container grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-extrabold text-brand">SmartGrids</p>
          <p className="mt-2 text-sm opacity-80">
            A headless commerce storefront powered by Drupal and Next.js.
          </p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-bold uppercase tracking-wider">{column.title}</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="opacity-80 hover:underline hover:opacity-100">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10 py-4 text-center text-sm opacity-70">
        © {new Date().getFullYear()} SmartGrids. All rights reserved.
      </div>
    </footer>
  );
}
