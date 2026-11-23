import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vibrate = vi.fn((_duration: number) => true);
let haptic: typeof import("./haptics.js").haptic;

function setVibration(value: unknown) {
  Object.defineProperty(navigator, "vibrate", { value, configurable: true, writable: true });
}

describe("haptic feedback", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    // The throttle lives at module scope; reload it so each case starts fresh.
    vi.resetModules();
    ({ haptic } = await import("./haptics.js"));
    setVibration(vibrate);
  });
  afterEach(() => {
    vi.useRealTimers();
    vibrate.mockClear();
    vi.restoreAllMocks();
  });

  it("is safe in non-browser runtimes", () => {
    setVibration(undefined);
    expect(() => haptic()).not.toThrow();
  });

  it("uses a short, clamped pulse", () => {
    haptic();
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 200);
    haptic(999);
    expect(vibrate).toHaveBeenLastCalledWith(8);
    vi.setSystemTime(Date.now() + 200);
    haptic(0);
    expect(vibrate).toHaveBeenLastCalledWith(1);
  });

  it("swallows bursts so a fast tap sequence does not turn into a rattle", () => {
    haptic(5);
    haptic(5);
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(120);
    haptic(5);
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it("never lets a blocked vibration break the interaction", () => {
    setVibration(() => { throw new Error("denied"); });
    expect(() => haptic(4)).not.toThrow();
  });
});
