import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PixelIcon } from "../ui/PixelIcon";

export type SearchItem = { id: string; label: string; hint?: string };

// Collapsed to a single button; expands smoothly into a field with results only while in use.
export function SearchField({ items, onSelect }: { items: SearchItem[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // Two search fields can coexist (a breakpoint re-render, or a future shell); a unique
  // listbox id keeps `aria-controls` pointing at the right list.
  const listId = useId();
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? items.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)) : items).slice(0, 8);
  }, [items, query]);
  // Returning focus to the trigger keeps keyboard and screen-reader users anchored.
  const close = (restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    setIndex(0);
    if (restoreFocus) window.requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
  };
  const choose = (id: string) => { close(true); onSelect(id); };

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  // Keep the highlighted option inside the (possibly shrinking) result list.
  useEffect(() => { setIndex((current) => Math.min(current, Math.max(0, results.length - 1))); }, [results.length]);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); close(true); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1))); }
    if (event.key === "ArrowUp") { event.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    if (event.key === "Enter" && results[index]) { event.preventDefault(); choose(results[index].id); }
  };

  return (
    <div ref={root} className="search-field" role="search">
      <button ref={toggle} type="button" className="search-toggle" aria-label="Search" aria-expanded={open} onClick={() => setOpen(true)}>
        <PixelIcon name="search" size={20} />
        <span className="search-toggle-text">Search</span>
      </button>
      {open && (
        <div className="search-expanded" onKeyDown={onKeyDown}>
          <PixelIcon name="search" size={20} className="search-leading" />
          <input
            ref={input}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
            placeholder="Search pages and applications"
            aria-label="Search pages and applications"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[index] ? `${listId}-option-${index}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            type="search"
          />
          <button type="button" className="search-close" aria-label="Close search" onClick={() => close(true)}>
            <PixelIcon name="close" size={16} />
          </button>
          <ul id={listId} className="search-results" role="listbox" aria-label="Search results">
            {results.length ? results.map((item, i) => (
              <li key={item.id} role="none">
                <button type="button" role="option" id={`${listId}-option-${i}`} aria-selected={i === index} tabIndex={-1}
                  className={i === index ? "is-active" : undefined} onMouseEnter={() => setIndex(i)} onClick={() => choose(item.id)}>
                  <span>{item.label}</span>{item.hint && <small>{item.hint}</small>}
                </button>
              </li>
            )) : <li className="search-empty" role="option" aria-selected="false" aria-disabled="true">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
