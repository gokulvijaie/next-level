/**
 * Homepage — fully schema-driven. Sections come from Drupal "section"
 * nodes; the SectionRenderer maps each to a component. Statically
 * rendered with ISR + tag-based revalidation, so editors publish in
 * Drupal and the page updates within seconds — no deploys.
 */
import { Suspense } from "react";
import { getSections } from "@/lib/services/sections";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { ProductCardSkeleton } from "@/components/ui/skeleton";

export default async function HomePage() {
  const sections = await getSections();

  return (
    <div className="container">
      {sections.map((section) => (
        <Suspense key={section.id} fallback={<SectionFallback />}>
          <SectionRenderer section={section} />
        </Suspense>
      ))}
    </div>
  );
}

function SectionFallback() {
  return (
    <div className="my-8">
      <div className="mb-4 h-6 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={i >= 4 ? "hidden xl:block" : i >= 2 ? "hidden md:block" : ""}>
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
