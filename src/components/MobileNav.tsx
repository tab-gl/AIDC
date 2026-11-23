import { useEffect, useState, type ReactNode } from "react";

export type MobileNavItem = { id: string; label: string; icon: ReactNode };

// Floating bottom navigation for phones. Hides while scrolling down and returns on scroll up.
export function MobileNav({ items, active, onSelect }: { items: MobileNavItem[]; active: string; onSelect: (id: string) => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = 0;
    const onScroll = (event: Event) => {
      const target = event.target;
      const y = target instanceof Element ? target.scrollTop : window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, []);
  return (
    <nav className={`mobile-nav${hidden ? " is-hidden" : ""}`} aria-label="Primary">
      {items.map((item) => (
        <button key={item.id} type="button" className="mobile-nav-item" aria-current={active === item.id ? "page" : undefined} onClick={() => onSelect(item.id)}>
          <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="mobile-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
