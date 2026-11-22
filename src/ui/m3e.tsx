import { useEffect, useRef } from "react";
import "@m3e/web/theme";
import "@m3e/web/switch";
import "@m3e/web/loading-indicator";
import "@m3e/web/progress-indicator";

type SwitchEl = HTMLElement & { checked: boolean };
/** Material 3 Expressive switch with a visible label, controlled from React. */
export function M3Switch({ label, description, checked, disabled, onChange }: { label: string; description?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  const ref = useRef<SwitchEl>(null);
  const handler = useRef(onChange);
  handler.current = onChange;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const listener = () => handler.current(el.checked);
    el.addEventListener("change", listener);
    return () => el.removeEventListener("change", listener);
  }, []);
  useEffect(() => { if (ref.current && ref.current.checked !== checked) ref.current.checked = checked; }, [checked]);
  return <label className="m3-row">
    <span className="m3-row-text"><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <m3e-switch ref={ref as never} checked={checked} disabled={disabled} aria-label={label} />
  </label>;
}
export function M3Loading({ label = "Loading" }: { label?: string }) {
  return <span className="m3-loading" role="status" aria-label={label}><m3e-loading-indicator /></span>;
}
/** Determinate m3e/web linear progress; `max` defaults to 100 like a percentage. */
export function M3Progress({ value, max = 100, label, className }: { value: number; max?: number; label: string; className?: string }) {
  const clamped = Math.max(0, Math.min(value, max));
  return <m3e-linear-progress-indicator mode="determinate" value={clamped} max={max} role="progressbar" aria-label={label} className={className} />;
}
