import { useEffect, useMemo, useRef, useState } from "react";

export type SearchItem = { id: string; label: string; hint?: string };

// Collapsed to a single button; expands smoothly into a field with results only while in use.
export function SearchField({ items, onSelect }: { items: SearchItem[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)) : items).slice(0, 8);
  }, [items, query]);
  const close = () => { setOpen(false); setQuery(""); setIndex(0); };
  const choose = (id: string) => { close(); onSelect(id); };

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { close(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    if (event.key === "Enter" && results[index]) { event.preventDefault(); choose(results[index].id); }
  };

  return (
    <div ref={root} className="search-field" role="search">
      <button type="button" className="search-toggle" aria-label="Search" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
        <span className="search-toggle-text">Search</span>
      </button>
      {open && (
        <div className="search-expanded" onKeyDown={onKeyDown}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
          <input ref={input} value={query} onChange={(e) => { setQuery(e.target.value); setIndex(0); }} placeholder="Search pages and applications" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="search-results" autoComplete="off" />
          <button type="button" className="search-close" aria-label="Close search" onClick={close}>×</button>
          <ul id="search-results" className="search-results" role="listbox">
            {results.length ? results.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === index}>
                <button type="button" className={i === index ? "is-active" : undefined} onMouseEnter={() => setIndex(i)} onClick={() => choose(item.id)}>
                  <span>{item.label}</span>{item.hint && <small>{item.hint}</small>}
                </button>
              </li>
            )) : <li className="search-empty">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
