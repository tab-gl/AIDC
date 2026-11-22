import { useEffect, useState } from "react";

export type Preferences = { theme: "light" | "dark" | "system"; density: "comfortable" | "compact"; showTips: boolean; reduceMotion: boolean };
export const defaultPreferences: Preferences = { theme: "system", density: "comfortable", showTips: true, reduceMotion: false };
const KEY = "aidc-neo-preferences-v1";
const EVENT = "aidc:preferences-change";

export function readPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      theme: ["light", "dark", "system"].includes(p.theme) ? p.theme : defaultPreferences.theme,
      density: ["comfortable", "compact"].includes(p.density) ? p.density : defaultPreferences.density,
      showTips: typeof p.showTips === "boolean" ? p.showTips : defaultPreferences.showTips,
      reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : defaultPreferences.reduceMotion
    };
  } catch { return defaultPreferences; }
}
export function savePreferences(next: Preferences): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { return false; }
  window.dispatchEvent(new Event(EVENT));
  return true;
}
export function resetPreferences(): boolean {
  try { localStorage.removeItem(KEY); } catch { window.dispatchEvent(new Event(EVENT)); return false; }
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
  useEffect(() => { document.documentElement.dataset.reduceMotion = String(prefs.reduceMotion); }, [prefs.reduceMotion]);
  return prefs;
}
