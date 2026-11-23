// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

// Integration coverage for both shells: the phone shell (floating pixel navigation and the
// account sheet that now owns Settings) and the desktop shell (unchanged side navigation).

const MOBILE_QUERY = /max-width:\s*760px/;

function setViewport(width: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: MOBILE_QUERY.test(query) ? width <= 760 : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      addListener: () => {},
      removeListener: () => {}
    })
  });
}

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

function mockApi() {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/me")) return json({ user: { id: "dev-1", name: "Ada Lovelace", email: "ada@example.test" } });
    if (url.includes("/api/applications")) return json({ applications: [] });
    if (url.includes("/api/quota")) return json({ quota: { count: 0, limit: 5, remaining: 5 } });
    if (url.includes("/api/activity")) return json({ events: [] });
    if (url.includes("/api/integration/discovery")) return json({ status: "ready" });
    if (url.includes("/api/health")) return json({ ok: true });
    if (url.includes("/api/analytics")) {
      return json({ days: 7, items: [], total: 0, failedAttempts: 0, uniqueUsers: 0, sessions: { active: 0, recent: [] }, uptime: { operational: 0, total: 0, average_percent: null, applications: [] } });
    }
    return json({});
  }) as never;
}

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  mockApi();
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  globalThis.ResizeObserver = Observer as never;
  globalThis.IntersectionObserver = Observer as never;
  window.scrollTo = vi.fn() as never;
  Element.prototype.scrollTo = vi.fn() as never;
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0)) as never;
  window.cancelAnimationFrame = ((handle: number) => window.clearTimeout(handle)) as never;
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("phone shell", () => {
  it("keeps four destinations in the floating bar and settings behind the profile", async () => {
    setViewport(390);
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: "Primary" });
    for (const label of ["Overview", "Apps", "Analytics", "Activity"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(nav.querySelectorAll("button[aria-current]")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Account menu" })).toBeNull();
    // The bar is drawn with the Ace ID pixel glyphs.
    expect(nav.querySelectorAll("svg.pixel-icon")).toHaveLength(4);
  }, 20_000);

  it("moves the active state and label to the chosen destination", async () => {
    setViewport(390);
    render(<App />);
    const analytics = await screen.findByRole("button", { name: "Analytics" });
    expect(analytics.getAttribute("aria-current")).toBeNull();
    fireEvent.click(analytics);
    await waitFor(() => expect(screen.getByRole("button", { name: "Analytics" }).getAttribute("aria-current")).toBe("page"));
    expect(window.location.hash).toBe("#analytics");
    expect(await screen.findByRole("heading", { name: "Analytics", level: 1 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Overview" }).getAttribute("aria-current")).toBeNull();
  }, 20_000);

  it("opens the account sheet from the profile photo and reaches settings from it", async () => {
    setViewport(390);
    render(<App />);
    const profile = await screen.findByRole("button", { name: /account and settings/i });
    expect(profile.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(profile);
    const dialog = await screen.findByRole("dialog", { name: "Account" });
    expect(dialog.textContent).toContain("Ada Lovelace");
    expect(dialog.textContent).toContain("ada@example.test");
    expect(profile.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /^Settings/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Settings", level: 1 })).toBeTruthy(), { timeout: 5_000 });
    expect(window.location.hash).toBe("#settings");
    // A settings page is not a bar destination; the profile slot carries the state instead.
    await waitFor(() => expect(screen.getByRole("button", { name: /account and settings/i }).className).toContain("is-active"));
  }, 20_000);
});

describe("desktop shell", () => {
  it("still uses the side navigation and account menu", async () => {
    setViewport(1280);
    render(<App />);
    expect(await screen.findByRole("link", { name: "Applications" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Account menu" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Settings" }).length).toBeGreaterThan(0);
  }, 20_000);
});
