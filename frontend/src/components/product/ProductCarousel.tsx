"use client";

/**
 * Swipeable product rail — Swiper for native-feel touch physics (momentum,
 * free-mode snapping, fractional "peek" slides) + Framer Motion for the
 * section entrance and control feedback. Cards inside are
 * AnimatedProductCards, so each slide fades up once as it enters the
 * viewport — including when swiped into view horizontally.
 */
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, FreeMode, Navigation, Pagination } from "swiper/modules";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";
import { AnimatedProductCard } from "@/components/product/AnimatedProductCard";
import { EASE, useMotionPrefs, VIEWPORT_ONCE } from "@/lib/motion";
import type { Product } from "@/types/product";

type Props = {
  title: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Automatic movement (selected rails only — never grids/search). */
  autoplay?: boolean;
};

export function ProductCarousel({
  title,
  products,
  viewAllHref,
  viewAllLabel = "View all",
  autoplay = false,
}: Props) {
  const prefs = useMotionPrefs();
  const prevRef = React.useRef<HTMLButtonElement>(null);
  const nextRef = React.useRef<HTMLButtonElement>(null);
  const sectionRef = React.useRef<HTMLElement>(null);
  const swiperRef = React.useRef<SwiperInstance | null>(null);

  // Autoplay is disabled entirely under reduced motion / lite devices.
  const autoplayEnabled = autoplay && !prefs.reduced && !prefs.lite;

  // Pause automatic movement when the tab is hidden, when the carousel
  // leaves the viewport, and while any slide has keyboard focus. Swiper's
  // own pauseOnMouseEnter + disableOnInteraction cover hover and touch.
  React.useEffect(() => {
    if (!autoplayEnabled) return;
    const section = sectionRef.current;
    const swiper = () => swiperRef.current;

    const onVisibility = () => {
      if (document.hidden) swiper()?.autoplay?.stop();
      else swiper()?.autoplay?.start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) swiper()?.autoplay?.start();
        else swiper()?.autoplay?.stop();
      },
      { threshold: 0.2 },
    );
    if (section) observer.observe(section);

    const onFocusIn = () => swiper()?.autoplay?.stop();
    const onFocusOut = () => swiper()?.autoplay?.start();
    section?.addEventListener("focusin", onFocusIn);
    section?.addEventListener("focusout", onFocusOut);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      section?.removeEventListener("focusin", onFocusIn);
      section?.removeEventListener("focusout", onFocusOut);
    };
  }, [autoplayEnabled]);

  if (!products.length) return null;

  return (
    <motion.section
      ref={sectionRef}
      initial={prefs.reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_ONCE}
      transition={{ duration: prefs.reduced ? 0 : 0.4, ease: EASE }}
      className="product-swiper relative my-8"
      aria-label={title}
      aria-roledescription={autoplayEnabled ? "auto-advancing carousel" : undefined}
    >
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="whitespace-nowrap text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {viewAllLabel}
            <span className="sr-only">: {title}</span>
          </Link>
        )}
      </header>

      <div className="relative">
        <NavButton refEl={prevRef} side="left" label="Previous products" reduced={prefs.reduced} />

        <Swiper
          modules={[FreeMode, Navigation, A11y, Autoplay, Pagination]}
          slidesPerView={1.2}
          spaceBetween={12}
          freeMode={autoplayEnabled ? false : { enabled: true, sticky: true }}
          loop={autoplayEnabled && products.length >= 6}
          speed={prefs.reduced ? 0 : 600}
          autoplay={
            autoplayEnabled
              ? {
                  delay: 3500,
                  pauseOnMouseEnter: true,
                  disableOnInteraction: true,
                  stopOnLastSlide: false,
                }
              : false
          }
          pagination={
            autoplayEnabled
              ? { clickable: true, el: ".sg-carousel-pagination" }
              : false
          }
          breakpoints={{
            480: { slidesPerView: 2.2, spaceBetween: 12 },
            768: { slidesPerView: 3.2, spaceBetween: 16 },
            1024: { slidesPerView: 4, spaceBetween: 16 },
            1280: { slidesPerView: 5, spaceBetween: 20 },
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onBeforeInit={(swiper) => {
            if (typeof swiper.params.navigation === "object" && swiper.params.navigation) {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
            }
          }}
          navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }}
          a11y={{ prevSlideMessage: "Previous products", nextSlideMessage: "Next products" }}
        >
          {products.map((product, index) => (
            <SwiperSlide key={product.id} className="!h-auto">
              <AnimatedProductCard product={product} index={index} />
            </SwiperSlide>
          ))}
        </Swiper>

        <NavButton refEl={nextRef} side="right" label="Next products" reduced={prefs.reduced} />
      </div>

      {autoplayEnabled && (
        <div className="sg-carousel-pagination mt-2 flex justify-center gap-1 [&_.swiper-pagination-bullet]:h-2 [&_.swiper-pagination-bullet]:w-2 [&_.swiper-pagination-bullet]:bg-border [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet-active]:!bg-primary" />
      )}
    </motion.section>
  );
}

function NavButton({
  refEl,
  side,
  label,
  reduced,
}: {
  refEl: React.RefObject<HTMLButtonElement | null>;
  side: "left" | "right";
  label: string;
  reduced: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <motion.button
      ref={refEl}
      type="button"
      aria-label={label}
      whileHover={reduced ? undefined : { scale: 1.06 }}
      whileTap={reduced ? undefined : { scale: 0.92 }}
      transition={{ duration: 0.15, ease: EASE }}
      className={`absolute top-[40%] z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-card shadow-card-hover disabled:opacity-0 md:[@media(hover:hover)]:inline-flex ${
        side === "left" ? "-left-3" : "-right-3"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </motion.button>
  );
}
