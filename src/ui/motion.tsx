import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "../lib/prefs";

/**
 * Motion primitives shared by the landing page and the console.
 *
 * The behaviour is adapted from two copy-paste animation collections rather than
 * added as dependencies: Animata's reveal and border-trail (animata.design) and
 * Skiper UI's pointer spotlight (skiper-ui.com). Both publish Tailwind and
 * framer-motion source; AIDC is Astryx plus plain CSS, so each effect is rebuilt
 * here with IntersectionObserver and CSS, and respects the saved reduced-motion
 * preference and the system setting.
 */

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    // Without an observer (tests, older browsers) or with motion reduced, show the content at once.
    if (!element || reducedMotion || typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setShown(true);
      observer.disconnect();
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return <div ref={ref} className={`motion-reveal${shown ? " is-shown" : ""}${className ? ` ${className}` : ""}`}
    style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
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
