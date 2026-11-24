// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApplicationDrawer } from "./ApplicationDrawer";
import { api } from "../lib/api";
import type { Application } from "../types";

vi.mock("../lib/api", () => ({
  api: {
    applications: {
      redirectUris: vi.fn(async () => ({ redirect_uris: [] })),
      scopes: vi.fn(async () => ({ scopes: ["openid", "email"] })),
      credentials: vi.fn(async () => ({ credentials: [] })),
      branding: vi.fn(async () => ({ branding: { application_id: "app-1" } })),
      sessions: vi.fn(async () => ({ sessions: [] })),
      uptime: vi.fn(async () => ({ days: 7, summary: { total_checks: 0, successful_checks: 0, uptime_percent: null, last_checked_at: null, status: "no_data" }, daily: [], latest: null })),
      activity: vi.fn(async () => ({ events: [] }))
    }
  }
}));

const application: Application = { id: "app-1", name: "Checkout", description: "Storefront", client_id: "client-1", origin_url: "https://shop.example.test", status: "active" };

beforeEach(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} }
  globalThis.ResizeObserver = Observer as never;
  // Astryx's dialog builds ids with CSS.escape, which jsdom does not implement.
  Object.defineProperty(globalThis, "CSS", { configurable: true, value: { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "\\$&") } });
  // jsdom ships <dialog> without the modal methods the Astryx drawer calls.
  const dialog = window.HTMLDialogElement?.prototype;
  if (dialog) {
    dialog.showModal = function showModal(this: HTMLDialogElement) { this.open = true; };
    dialog.show = function show(this: HTMLDialogElement) { this.open = true; };
    dialog.close = function close(this: HTMLDialogElement) { this.open = false; };
  }
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
      addListener: () => {}, removeListener: () => {}
    })
  });
});
afterEach(cleanup);

describe("ApplicationDrawer", () => {
  it("exposes the eight sections as a glisse tab bar", async () => {
    render(<ApplicationDrawer application={application} onClose={() => {}} onUpdate={async () => {}} onDelete={async () => {}} />);
    const tablist = await screen.findByRole("tablist", { name: "Application settings" });
    expect(tablist.querySelectorAll('[role="tab"]')).toHaveLength(8);
    expect(screen.getByRole("tab", { name: /Overview/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Credentials/ }).getAttribute("aria-selected")).toBe("false");
  });

  it("loads a section when its tab is chosen", async () => {
    render(<ApplicationDrawer application={application} onClose={() => {}} onUpdate={async () => {}} onDelete={async () => {}} />);
    fireEvent.click(await screen.findByRole("tab", { name: /Credentials/ }));
    await waitFor(() => expect(api.applications.credentials).toHaveBeenCalledWith("app-1"));
    expect(screen.getByRole("tab", { name: /Credentials/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel", { name: "Credentials" })).toBeTruthy();
  });
});
