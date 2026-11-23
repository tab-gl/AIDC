import { useEffect, useRef, type ReactNode } from "react";

// Bottom sheet used on phones for menus and quick actions.
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div ref={panel} className="sheet-panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="sheet-grip" aria-hidden="true" />
        <h2 className="sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
