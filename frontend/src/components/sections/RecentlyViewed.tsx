"use client";

/**
 * Client-side "Recently viewed" rail. History lives in localStorage so
 * every page stays statically cacheable — personalization without
 * sacrificing the CDN.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, FreeMode } from "swiper/modules";
import "swiper/css";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ProductImagePlaceholder } from "@/components/ui/product-image-placeholder";
import type { Product } from "@/types/product";

const STORAGE_KEY = "smartgrids_recently_viewed";
const MAX_ITEMS = 12;

type RecentItem = {
  id: string;
  title: string;
  path: string;
  image: string | null;
  price: number | null;
  currency: string;
};

function read(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Drop this on product pages to record the visit. Renders nothing. */
export function RecordProductView({ product }: { product: Product }) {
  React.useEffect(() => {
    const item: RecentItem = {
      id: product.id,
      title: product.title,
      path: product.path,
      image: product.image?.url ?? null,
      price: product.price,
      currency: product.currency,
    };
    try {
      const items = [item, ...read().filter((i) => i.id !== item.id)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage unavailable.
    }
  }, [product]);
  return null;
}

export function RecentlyViewed({ title = "Recently viewed", excludeId }: { title?: string; excludeId?: string }) {
  const [items, setItems] = React.useState<RecentItem[]>([]);
  const { format } = useCurrency();

  React.useEffect(() => {
    setItems(read().filter((i) => i.id !== excludeId));
  }, [excludeId]);

  if (!items.length) return null;

  return (
    <section className="product-swiper my-8" aria-label={title}>
      <h2 className="mb-4 text-xl font-extrabold tracking-tight">{title}</h2>
      <Swiper
        modules={[FreeMode, A11y]}
        slidesPerView={2.2}
        spaceBetween={12}
        freeMode={{ enabled: true, sticky: true }}
        breakpoints={{
          768: { slidesPerView: 4.2, spaceBetween: 16 },
          1280: { slidesPerView: 6, spaceBetween: 16 },
        }}
      >
        {items.map((item) => (
          <SwiperSlide key={item.id} className="!h-auto">
            <Link
              href={item.path}
              className="group block h-full overflow-hidden rounded-lg bg-card shadow-card transition-shadow hover:shadow-card-hover"
            >
              <div className="relative aspect-[4/5] bg-muted">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 45vw, 16vw"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                ) : (
                  <ProductImagePlaceholder />
                )}
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{item.title}</h3>
                <p className="mt-1 font-bold">{format(item.price, item.currency)}</p>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
