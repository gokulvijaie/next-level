"use client";

/**
 * Shared motion system.
 *
 * Principles enforced here so every animated component behaves the same:
 * - Only `transform` and `opacity` are animated (GPU-composited, no layout).
 * - `prefers-reduced-motion` collapses every animation to an instant state
 *   change (durations -> 0, offsets -> 0).
 * - "Lite" mode (small screen + low CPU/memory) shortens distances and
 *   durations and drops decorative effects so low-powered phones stay at
 *   60fps.
 * - Entrance animations are viewport-driven and run ONCE (`once: true`),
 *   never replaying on small scrolls.
 */
import * as React from "react";
import { useReducedMotion, type Transition } from "framer-motion";

/** Brand easing — matches the CSS `cubic-bezier(0.2, 0, 0, 1)` used in the theme. */
export const EASE = [0.2, 0, 0, 1] as const;

export type MotionPrefs = {
  /** User asked for reduced motion — animations become instant. */
  reduced: boolean;
  /** Low-powered / small device — keep animations, but cheaper and shorter. */
  lite: boolean;
  /** Device has real hover (mouse/trackpad) — enables hover-only effects. */
  hoverable: boolean;
};

export function useMotionPrefs(): MotionPrefs {
  const reduced = useReducedMotion() ?? false;
  const [prefs, setPrefs] = React.useState({ lite: false, hoverable: false });

  React.useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const small = window.matchMedia("(max-width: 640px)").matches;
    const lowCpu = (nav.hardwareConcurrency ?? 8) <= 4;
    const lowMem = (nav.deviceMemory ?? 8) <= 4;
    setPrefs({
      lite: small && (lowCpu || lowMem),
      hoverable: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    });
  }, []);

  return { reduced, ...prefs };
}

/** Standard springy-but-settled transition for entrances. */
export function entranceTransition(prefs: MotionPrefs, delay = 0): Transition {
  return {
    duration: prefs.reduced ? 0 : prefs.lite ? 0.28 : 0.45,
    ease: EASE,
    delay: prefs.reduced ? 0 : delay,
  };
}

/**
 * Fade + rise + subtle scale entrance. `index` staggers cards within a
 * grid row (modulo keeps delays short for long grids where lower rows
 * trigger independently on scroll).
 */
export function fadeUpVariants(prefs: MotionPrefs, index = 0) {
  const delay = prefs.lite ? 0 : (index % 4) * 0.06;
  return {
    hidden: {
      opacity: 0,
      y: prefs.reduced ? 0 : prefs.lite ? 12 : 24,
      scale: prefs.reduced ? 1 : 0.98,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: entranceTransition(prefs, delay),
    },
  };
}

/** Viewport config: animate once when ~15% of the element is visible. */
export const VIEWPORT_ONCE = { once: true, amount: 0.15 } as const;
