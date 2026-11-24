import { memo, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { PixelIcon } from "../ui/PixelIcon";
import type { PixelIconName } from "../ui/pixelIcons";
import { haptic } from "../lib/haptics";

export type MobileNavItem = { id: string; label: string; icon: PixelIconName };
export type MobileAccount = { name: string; avatarUrl?: string };

type Props = {
  items: MobileNavItem[];
  /** Currently selected destination, or null when the account sheet owns the screen. */
  active: string | null;
  onSelect: (id: string) => void;
  account: MobileAccount;
  /** Marks the profile slot as selected (used while Settings is open). */
  accountActive?: boolean;
  accountOpen?: boolean;
  onAccount: () => void;
  hapticsEnabled: boolean;
  /** Keeps the bar on screen while a sheet owns the viewport. */
  pinned?: boolean;
};

/**
 * Material 3 Expressive style floating navigation bar.
 *
 * Selected destinations expand into a filled pill with their label; the rest stay icon-only,
 * so the bar reads as a compact, thumb-friendly capsule. Settings is not a destination here:
 * it lives behind the profile photo on the right, which keeps the bar to four places.
 *
 * Micro-interactions: the pill springs open around the active destination, its icon pops as it
 * lands, a soft state layer answers the finger while it is down, and a mild haptic pulse fires on
 * touch. Everything is CSS-driven and collapses under prefers-reduced-motion.
 */
export const MobileNav = memo(function MobileNav({ items, active, onSelect, account, accountActive = false, accountOpen = false, onAccount, hapticsEnabled, pinned = false }: Props) {
  const [hidden, setHidden] = useState(false);

  // A new destination always brings the bar back, even if it was hidden mid-scroll.
  useEffect(() => { setHidden(false); }, [active, pinned]);

  useEffect(() => {
    if (pinned) { setHidden(false); return; }
    let last = 0;
    let scheduled = false;
    const onScroll = (event: Event) => {
      const target = event.target;
      const y = target instanceof Element ? target.scrollTop : window.scrollY;
      const delta = y - last;
      const atTop = y <= 96;
      // Ignore rubber-banding and tiny sub-pixel moves, and never hide near the top.
      if (Math.abs(delta) < 12) { if (atTop) setHidden(false); return; }
      last = y;
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        setHidden(delta > 0 && !atTop);
      });
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [pinned]);

  // Arrow keys walk the bar like a toolbar, so the dock is usable without a pointer.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  // Touch answers the finger the moment it lands; keyboard activation arrives as a detail-0 click.
  const tap = () => { if (hapticsEnabled) haptic(5); };
  const press = (event: ReactMouseEvent<HTMLElement>) => { if (!event.detail) tap(); };

  return (
    <nav className={`mobile-nav${hidden ? " is-hidden" : ""}`} aria-label="Primary" onKeyDown={onKeyDown}>
      <div className="mobile-nav-items">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item${isActive ? " is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              onPointerDown={tap}
              onClick={(event) => { press(event); onSelect(item.id); }}
            >
              <span className="mobile-nav-icon"><PixelIcon name={item.icon} size={26} filled={isActive} /></span>
              <span className="mobile-nav-label" aria-hidden="true"><span>{item.label}</span></span>
            </button>
          );
        })}
      </div>
      <span className="mobile-nav-divider" aria-hidden="true" />
      <button
        type="button"
        className={`mobile-nav-account${accountActive ? " is-active" : ""}`}
        aria-label={`Ace ID and settings${account.name ? ` (${account.name})` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={accountOpen}
        onPointerDown={tap}
        onClick={(event) => { press(event); onAccount(); }}
      >
        <span className="mobile-nav-avatar">
          <Avatar name={account.name} src={account.avatarUrl} size={32} tooltip={false} />
        </span>
      </button>
    </nav>
  );
});
