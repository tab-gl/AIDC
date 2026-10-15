import { useEffect, useState } from "react";
import { useInView, useMotionValue, useMotionValueEvent, useSpring } from "motion/react";
import { useRef } from "react";

type Props = { value: number; delay?: number; decimalPlaces?: number; className?: string };

/** Magic UI NumberTicker pattern: spring-driven count-up, triggered on first view. */
export function NumberTicker({ value, delay = 0, decimalPlaces = 0, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const [display, setDisplay] = useState((0).toFixed(decimalPlaces));
  useMotionValueEvent(springValue, "change", (latest) => setDisplay(latest.toFixed(decimalPlaces)));
  useEffect(() => {
    if (!inView) return;
    const timeout = window.setTimeout(() => motionValue.set(value), Math.max(0, delay * 1000));
    return () => window.clearTimeout(timeout);
  }, [inView, value, delay, motionValue]);
  useEffect(() => { if (!inView) setDisplay((0).toFixed(decimalPlaces)); }, [inView, decimalPlaces]);
  return <span ref={ref} className={className || "neo-number-ticker"} aria-label={value.toLocaleString()}>{Number(display).toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })}</span>;
}
