import { useState } from "react";

const KEY = "aidc_cookie_notice_v1";
const POLICY = "https://identity.ace-base.cc/cookie-policy";

function wasDismissed(): boolean {
  try { return window.localStorage.getItem(KEY) === "1"; } catch { return false; }
}

// Notice for essential cookies only (session and CSRF). Storage failures fall back to showing the banner.
export function CookieBanner() {
  const [open, setOpen] = useState(() => !wasDismissed());
  if (!open) return null;
  const dismiss = () => {
    try { window.localStorage.setItem(KEY, "1"); } catch { /* ignore: banner simply reappears next visit */ }
    setOpen(false);
  };
  return (
    <section className="cookie-banner" role="region" aria-label="Cookie notice">
      <p>
        AIDC uses essential cookies to keep you signed in and to protect against cross-site request forgery (for example <code>aidc_csrf</code>).
        They are required for the console to work. <a href={POLICY} target="_blank" rel="noopener noreferrer">Cookie policy</a>
      </p>
      <button type="button" onClick={dismiss}>Got it</button>
    </section>
  );
}
