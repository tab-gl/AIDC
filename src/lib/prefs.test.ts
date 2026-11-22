import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultPreferences, readPreferences, resetPreferences, savePreferences } from "./prefs";

describe("preferences", () => {
  let storage: Map<string, string>;
  let events: EventTarget;
  beforeEach(() => {
    storage = new Map();
    events = new EventTarget();
    vi.stubGlobal("window", events);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("persists, validates and announces preferences", () => {
    const listener = vi.fn();
    events.addEventListener("aidc:preferences-change", listener);
    const prefs = { ...defaultPreferences, theme: "dark" as const, contrast: "high" as const, textSize: "large" as const, defaultRange: 30 as const, hapticFeedback: false, showTips: false, reduceMotion: true };
    expect(savePreferences(prefs)).toBe(true);
    expect(readPreferences()).toEqual(prefs);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(resetPreferences()).toBe(true);
    expect(readPreferences()).toEqual(defaultPreferences);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("migrates older preferences and rejects invalid new settings", () => {
    storage.set("aidc-neo-preferences-v1", JSON.stringify({ theme: "dark", showTips: false, reduceMotion: true, contrast: "extreme", textSize: "huge", defaultRange: 100, hapticFeedback: "yes" }));
    expect(readPreferences()).toEqual({ ...defaultPreferences, theme: "dark", showTips: false, reduceMotion: true });
  });

  it("falls back safely for invalid or inaccessible storage", () => {
    storage.set("aidc-neo-preferences-v1", "not-json");
    expect(readPreferences()).toEqual(defaultPreferences);
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); }
    });
    expect(readPreferences()).toEqual(defaultPreferences);
    expect(savePreferences(defaultPreferences)).toBe(false);
    expect(resetPreferences()).toBe(false);
  });
});
