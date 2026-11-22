import { useEffect, useState } from "react";

export type Preferences = {
  theme: "light" | "dark" | "system";
  contrast: "standard" | "medium" | "high";
  textSize: "standard" | "large";
  defaultRange: 7 | 14 | 30;
  hapticFeedback: boolean;
  showTips: boolean;
  reduceMotion: boolean;
};
export const defaultPreferences: Preferences = { theme: "system", contrast: "standard", textSize: "standard", defaultRange: 7, hapticFeedback: true, showTips: true, reduceMotion: false };
export const PREFERENCES_KEY = "aidc-neo-preferences-v1";
const EVENT = "aidc:preferences-change";

export function readPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
    return {
      theme: ["light", "dark", "system"].includes(p.theme) ? p.theme : defaultPreferences.theme,
      contrast: ["standard", "medium", "high"].includes(p.contrast) ? p.contrast : defaultPreferences.contrast,
      textSize: ["standard", "large"].includes(p.textSize) ? p.textSize : defaultPreferences.textSize,
      defaultRange: [7, 14, 30].includes(p.defaultRange) ? p.defaultRange : defaultPreferences.defaultRange,
      hapticFeedback: typeof p.hapticFeedback === "boolean" ? p.hapticFeedback : defaultPreferences.hapticFeedback,
      showTips: typeof p.showTips === "boolean" ? p.showTips : defaultPreferences.showTips,
      reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : defaultPreferences.reduceMotion
    };
  } catch { return defaultPreferences; }
}
export function savePreferences(next: Preferences): boolean {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); } catch { return false; }
  window.dispatchEvent(new Event(EVENT));
  return true;
}
export function resetPreferences(): boolean {
  try { localStorage.removeItem(PREFERENCES_KEY); } catch { window.dispatchEvent(new Event(EVENT)); return false; }
  window.dispatchEvent(new Event(EVENT));
  return true;
}
/** Live, saved preferences (re-reads when Settings saves or another tab changes them). */
export function usePreferences(): Preferences {
  const [prefs, setPrefs] = useState(readPreferences);
  useEffect(() => {
    const sync = () => setPrefs(readPreferences());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  useEffect(() => { document.documentElement.dataset.reduceMotion = String(prefs.reduceMotion); document.documentElement.dataset.textSize = prefs.textSize; }, [prefs.reduceMotion, prefs.textSize]);
  return prefs;
}

/** Includes the system preference, including for components inside shadow DOM. */
export function useReducedMotion(): boolean {
  const { reduceMotion } = usePreferences();
  const [systemReduced, setSystemReduced] = useState(() => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduceMotion || systemReduced;
}
