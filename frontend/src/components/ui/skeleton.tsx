import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

/** Loading placeholder matching ProductCard dimensions (no layout shift). */
export function ProductCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-brand/30 shadow-card"
      aria-hidden
    >
      <Skeleton className="m-2 mb-0 aspect-[4/5] rounded-2xl" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <div className="mt-auto flex items-end justify-between">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </div>
  );
}
