// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MobileNav, type MobileNavItem } from "./MobileNav";

const items: MobileNavItem[] = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "applications", label: "Apps", icon: "grid" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "activity", label: "Activity", icon: "clock" }
];

const account = { name: "Ada Lovelace", avatarUrl: undefined };

function setup(overrides: Partial<Parameters<typeof MobileNav>[0]> = {}) {
  const onSelect = vi.fn();
  const onAccount = vi.fn();
  const props = {
    items,
    active: "overview" as string | null,
    onSelect,
    onAccount,
    account,
    accountOpen: false,
    accountActive: false,
    hapticsEnabled: true,
    ...overrides
  };
  const utils = render(<MobileNav {...props} />);
  return { ...utils, onSelect, onAccount };
}

const vibrate = vi.fn((_duration: number) => true);

beforeEach(() => {
  Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true, writable: true });
});

afterEach(() => {
  cleanup();
  vibrate.mockClear();
  vi.restoreAllMocks();
});

describe("floating navigation", () => {
  it("shows every destination and marks the active one for assistive technology", () => {
    setup({ active: "applications" });
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();
    for (const item of items) {
      expect(screen.getByRole("button", { name: item.label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Apps" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Overview" }).getAttribute("aria-current")).toBeNull();
    // The label is always rendered so it can animate open; it must stay in the markup.
    expect(screen.getByRole("button", { name: "Overview" }).textContent).toContain("Overview");
  });

  it("keeps settings out of the bar and behind the profile photo", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    const profile = screen.getByRole("button", { name: /ace id and settings/i });
    expect(profile.getAttribute("aria-haspopup")).toBe("dialog");
    expect(profile.getAttribute("aria-expanded")).toBe("false");
  });

  it("reports the selected destination and pulses once", () => {
    const { onSelect } = setup();
    const analytics = screen.getByRole("button", { name: "Analytics" });
    fireEvent.pointerDown(analytics);
    fireEvent.click(analytics);
    expect(onSelect).toHaveBeenCalledWith("analytics");
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate.mock.calls[0]?.[0]).toBeLessThanOrEqual(6);
  });

  it("opens the account sheet from the profile photo", () => {
    const { onAccount, onSelect } = setup({ accountOpen: true });
    const profile = screen.getByRole("button", { name: /ace id and settings/i });
    expect(profile.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(profile);
    expect(onAccount).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("stays quiet when haptics are switched off", () => {
    setup({ hapticsEnabled: false });
    const apps = screen.getByRole("button", { name: "Apps" });
    fireEvent.pointerDown(apps);
    fireEvent.click(apps);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("marks the profile slot when settings is the current page", () => {
    setup({ active: null, accountActive: true });
    const profile = screen.getByRole("button", { name: /ace id and settings/i });
    expect(profile.className).toContain("is-active");
  });

  it("walks the bar with the arrow keys", () => {
    setup();
    const overview = screen.getByRole("button", { name: "Overview" });
    const profile = screen.getByRole("button", { name: /ace id and settings/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Apps" }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "End" });
    expect(document.activeElement).toBe(profile);
    // The bar wraps rather than dead-ending on the profile slot.
    fireEvent.keyDown(profile, { key: "ArrowRight" });
    expect(document.activeElement).toBe(overview);
    fireEvent.keyDown(overview, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(profile);
  });
});
