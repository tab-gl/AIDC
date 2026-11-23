import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { PixelIcon } from "../ui/PixelIcon";
import { useReducedMotion } from "../lib/prefs";

type Props = {
  open: boolean;
  title: string;
  /** Short line under the title, read by assistive technology and shown to sighted users. */
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const DISMISS_AFTER = 104;

/**
 * Phone bottom sheet.
 *
 * Rendered inside the console shell so it keeps the Astryx theme scope (tokens, fonts and
 * dark mode), while page scroll is locked, focus is trapped and returned to the trigger on
 * close, the spring is shared on enter and exit, and a flick of the header dismisses it.
 */
export function Sheet({ open, title, description, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  // Parents pass an inline callback; keep the effect that owns focus and Escape stable.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dragStart = useRef<number | null>(null);
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();

  // Mount first, then paint the "in" state so the spring transition actually runs.
  useEffect(() => {
    if (open) {
      setPresent(true);
      setDismissing(false);
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = window.setTimeout(() => setPresent(false), reducedMotion ? 0 : 240);
    return () => window.clearTimeout(timer);
  }, [open, reducedMotion]);

  // Keep the page behind the sheet still; restore the exact scroll offset on close.
  useEffect(() => {
    if (!present) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    const paddingRight = root.style.paddingRight;
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
    return () => {
      root.style.overflow = overflow;
      root.style.paddingRight = paddingRight;
    };
  }, [present]);

  // Remember what had focus, close on Escape, and hand focus back on the way out.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    restoreFocus.current = previous;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // The panel mounts one render after `open` flips, so move focus only once it is in the DOM.
  useEffect(() => {
    if (!open || !present) return;
    const frame = window.requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [open, present]);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable?.length) { event.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === panel.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && current === last) { event.preventDefault(); first?.focus(); }
  };

  // Flick the header down to dismiss.
  const dragFrame = useRef(0);
  const dragLatest = useRef(0);
  useEffect(() => () => { if (dragFrame.current) window.cancelAnimationFrame(dragFrame.current); }, []);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    dragLatest.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    dragLatest.current = Math.max(0, event.clientY - dragStart.current);
    // A fast flick fires far more pointermoves than the screen can paint; apply one per frame
    // so the sheet follows the finger without re-rendering the whole list on every event.
    if (!dragFrame.current) {
      dragFrame.current = window.requestAnimationFrame(() => {
        dragFrame.current = 0;
        setDragY(dragLatest.current);
      });
    }
  };
  const endDrag = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragFrame.current) { window.cancelAnimationFrame(dragFrame.current); dragFrame.current = 0; }
    const travelled = dragLatest.current;
    if (travelled > DISMISS_AFTER) {
      // Let the panel continue from where the finger left it: the inline transform is the
      // spring's starting point, so the sheet slides away instead of snapping back up first.
      setDragY(travelled);
      setDismissing(true);
      onClose();
      return;
    }
    setDragY(0);
  };

  if (!present) return null;

  return (
    <div className={`sheet-root${visible ? " is-visible" : ""}`}>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={trapFocus}
        style={dismissing ? { transform: "translateY(100%)" } : dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
      >
        <div className="sheet-head" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <div className="sheet-grip" aria-hidden="true" />
          <div className="sheet-head-row">
            <div className="sheet-head-text">
              <h2 id={titleId} className="sheet-title">{title}</h2>
              {description && <p id={descriptionId} className="sheet-description">{description}</p>}
            </div>
            <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
              <PixelIcon name="close" size={18} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
