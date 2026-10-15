import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { routes, navigate, type RouteId } from "../lib/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Activity01Icon, Analytics01Icon, Grid2X2Icon, Home01Icon, Search01Icon, Settings01Icon, UserIcon } from "@hugeicons/core-free-icons";
const routeIcons = { overview: Home01Icon, applications: Grid2X2Icon, analytics: Analytics01Icon, activity: Activity01Icon, users: UserIcon, settings: Settings01Icon } satisfies Record<RouteId, typeof Home01Icon>;
type Props = { open: boolean; onClose: () => void };

export function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => routes.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery(""); setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);
  useEffect(() => { setActiveIndex(0); }, [query]);
  if (!open) return null;

  const activeItem = filtered[activeIndex] ?? filtered[0];
  const choose = (id: (typeof routes)[number]["id"]) => { navigate(id); onClose(); };
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && filtered.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % filtered.length); }
    else if (event.key === "ArrowUp" && filtered.length) { event.preventDefault(); setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length); }
    else if (event.key === "Enter" && activeItem) { event.preventDefault(); choose(activeItem.id); }
  };

  return <div className="neo-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="neo-command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
      <div className="neo-command-search"><HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.7} aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKeyDown} placeholder="Search pages…" aria-label="Search pages" aria-controls="neo-command-options" aria-activedescendant={activeItem ? `neo-command-option-${activeItem.id}` : undefined} /><kbd>ESC</kbd></div>
      <div id="neo-command-options" className="neo-command-results" role="listbox" aria-label="Available pages">
        {filtered.length ? filtered.map((item, index) => <button id={`neo-command-option-${item.id}`} type="button" role="option" aria-selected={index === activeIndex} key={item.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(item.id)}><HugeiconsIcon icon={routeIcons[item.id]} size={17} strokeWidth={1.7} aria-hidden="true" /><span>{item.label}</span><small>{index === activeIndex ? "Enter" : "Open"}</small></button>) : <p className="neo-command-empty">No matching pages. Try a different search.</p>}
      </div>
      <div className="neo-command-footer"><span>↑ ↓ Navigate</span><span>Enter to open</span><span>Esc to close</span></div>
    </section>
  </div>;
}
