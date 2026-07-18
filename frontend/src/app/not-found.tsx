import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container grid place-items-center gap-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-muted-foreground">404</p>
      <h1 className="text-2xl font-extrabold">Page not found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Back to home
      </Link>
    </div>
  );
}
