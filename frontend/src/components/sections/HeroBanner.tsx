import Image from "next/image";
import Link from "next/link";
import type { Section } from "@/types/section";
import { buttonVariants } from "@/components/ui/button";

export function HeroBanner({ title, banner }: { title: string; banner: Section["banner"] }) {
  return (
    <section className="theme-panel relative my-6 grid min-h-56 items-center overflow-hidden p-8 md:min-h-72 md:p-12">
      {banner?.image && (
        <>
          <Image
            src={banner.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover mix-blend-multiply opacity-30"
          />
          <div className="absolute inset-y-0 right-0 hidden w-1/2 rounded-l-[4rem] bg-white/90 md:block" aria-hidden />
        </>
      )}
      <div className="absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-white/75" aria-hidden />
      <div className="relative z-10 grid max-w-xl justify-items-start gap-3">
        {banner?.eyebrow && (
          <p className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary-foreground">
            {banner.eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-extrabold [text-wrap:balance] md:text-5xl">{title}</h2>
        {banner?.text && <p className="max-w-lg text-base font-medium">{banner.text}</p>}
        {banner?.href && (
          <Link href={banner.href} className={buttonVariants({ size: "lg" })}>
            {banner.cta ?? "Shop now"}
          </Link>
        )}
      </div>
    </section>
  );
}
