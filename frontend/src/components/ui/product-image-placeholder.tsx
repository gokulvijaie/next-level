import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn("grid h-full w-full place-items-center bg-secondary text-muted-foreground", className)}
      aria-label="No product image available"
      role="img"
    >
      <ImageOff className="h-8 w-8" aria-hidden />
    </div>
  );
}
