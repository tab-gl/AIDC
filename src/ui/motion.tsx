import { motion } from "motion/react";
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "../lib/prefs";

/**
 * Motion primitives shared by the landing page and the console.
 *
 * Reveal and the pointer spotlight are adapted from two copy-paste animation
 * collections: Animata's reveal and border-trail (animata.design) and Skiper UI's
 * pointer spotlight (skiper-ui.com). The reveal now runs on motion.dev (motion/react),
 * which also honours the saved reduced-motion preference and the system setting.
 */

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reducedMotion = useReducedMotion();
  return <motion.div
    className={`motion-reveal${className ? ` ${className}` : ""}`}
    initial={reducedMotion ? false : { opacity: 0, y: 14 }}
    whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
    animate={reducedMotion ? { opacity: 1, y: 0 } : undefined}
    viewport={{ once: true, margin: "0px 0px -6% 0px", amount: 0.06 }}
    transition={{ duration: 0.55, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
  >{children}</motion.div>;
}

/** Tracks the pointer inside a card so CSS can paint a soft spotlight beneath it. */
export function useSpotlight<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const onPointerMove = (event: ReactPointerEvent<T>) => {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };
  return { ref, onPointerMove };
}
