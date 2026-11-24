import { useLayoutEffect, useRef } from "react";
import { TabBar } from "./glisse";
import { Icon, type IconName } from "./Icon";

export type GlassTabItem = { value: string; label: string; icon?: IconName };

type Props = {
  /** Accessible name for the tab list. */
  label: string;
  items: GlassTabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Reflects a blocked interaction (for example while a mutation is in flight). */
  disabled?: boolean;
};

/**
 * A glisse tab bar: the selection springs between slots and lifts into a glass lens while it
 * is held or dragged. It keeps the ARIA tab pattern (tablist/tab, roving tabindex, arrow and
 * Home/End keys), so panels stay labelled and reachable by assistive technology.
 */
export function GlassTabs({ label, items, value, onChange, className, disabled }: Props) {
  const host = useRef<HTMLDivElement>(null);
  // glisse sizes its lens copies from --lg-tab-width, so the bar has to publish the slot in
  // pixels. A percentage resolves against different boxes in each copy and scrambles them.
  useLayoutEffect(() => {
    const bar = host.current?.querySelector<HTMLElement>(".lg-tab-bar");
    if (!bar) return;
    const size = () => {
      const inset = parseFloat(getComputedStyle(bar).getPropertyValue("--lg-tab-inset")) || 0;
      const slot = (bar.clientWidth - 2 * inset) / Math.max(items.length, 1);
      if (slot > 0) bar.style.setProperty("--lg-tab-width", `${slot}px`);
    };
    size();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(size);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [items.length]);

  return <div ref={host} className="glass-tabs-host">
    <TabBar
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={["glass-tabs", className].filter(Boolean).join(" ")}
      items={items.map((item) => ({
        value: item.value,
        label: item.label,
        icon: item.icon ? <Icon name={item.icon} size={20} /> : undefined
      }))}
      value={value}
      onValueChange={onChange}
    />
  </div>;
}
