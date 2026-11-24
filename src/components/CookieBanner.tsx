import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "aidc_cookie_notice_v1";
const POLICY = "https://identity.ace-base.cc/cookie-policy";
const EXIT_MS = 180;

function wasDismissed(): boolean {
  try { return window.localStorage.getItem(KEY) === "1"; } catch { return false; }
}

// Notice for essential cookies only (session and CSRF). Storage failures fall back to showing the banner.
export function CookieBanner() {
  const [state, setState] = useState<"open" | "closing" | "closed">(() => wasDismissed() ? "closed" : "open");
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  // The banner leaves the way it arrived instead of blinking out under the pointer.
  const dismiss = useCallback(() => {
    try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore: banner simply reappears next visit */ }
    setState("closing");
    timer.current = window.setTimeout(() => setState("closed"), EXIT_MS);
  }, []);

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, dismiss]);

  if (state === "closed") return null;
  return (
    <section className={`cookie-banner${state === "closing" ? " is-closing" : ""}`} role="region" aria-label="Cookie notice">
      <p className="cookie-banner-copy">
        <strong>Essential cookies only.</strong> A session cookie and a CSRF token (<code>aidc_csrf</code>)
        keep you signed in and block forged requests. No tracking or advertising.{" "}
        <a href={POLICY} target="_blank" rel="noopener noreferrer">Cookie policy</a>
      </p>
      <button type="button" className="cookie-banner-accept" onClick={dismiss}>Got it</button>
    </section>
  );
}
