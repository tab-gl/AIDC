// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GlassSegmented } from "./GlassSegmented";
import { GlassTabs } from "./GlassTabs";
import { Toggle } from "./Toggle";

// glisse fits its lens with ResizeObserver and observes the reduced-motion media query; jsdom
// has neither, and its canvas is a stub, so keep the helpers inert rather than animated.
beforeEach(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} }
  globalThis.ResizeObserver = Observer as never;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
      addListener: () => {}, removeListener: () => {}
    })
  });
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => { void callback; return 1; }) as never;
  window.cancelAnimationFrame = (() => {}) as never;
});
afterEach(cleanup);

const RANGES = [{ value: "7", label: "7 days" }, { value: "14", label: "14 days" }, { value: "30", label: "30 days" }];

describe("GlassSegmented", () => {
  it("renders a labelled radiogroup with one checked option", () => {
    render(<GlassSegmented label="Range" options={RANGES} value="14" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Range" });
    expect(group).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "14 days" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "7 days" }).getAttribute("aria-checked")).toBe("false");
  });

  it("reports clicks and arrow-key moves", () => {
    const onChange = vi.fn();
    render(<GlassSegmented label="Range" options={RANGES} value="7" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "30 days" }));
    expect(onChange).toHaveBeenLastCalledWith("30");
    fireEvent.keyDown(screen.getByRole("radio", { name: "7 days" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("14");
  });

  it("can hide its label visually without losing the accessible name", () => {
    render(<GlassSegmented hideLabel label="Time range" options={RANGES} value="7" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: "Time range" });
    expect(group).toBeTruthy();
    expect(screen.getByText("Time range").className).toContain("sr-only");
  });
});

describe("GlassTabs", () => {
  const items = [
    { value: "overview", label: "Overview", icon: "home" as const },
    { value: "credentials", label: "Credentials", icon: "key" as const },
    { value: "events", label: "Events", icon: "list" as const }
  ];

  it("keeps the ARIA tab pattern and renders an icon per tab", () => {
    render(<GlassTabs label="Application settings" items={items} value="overview" onChange={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Application settings" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: /Overview/ }).getAttribute("aria-selected")).toBe("true");
    expect(document.querySelectorAll(".lg-tab .lg-tab-icon svg")).toHaveLength(3);
  });

  it("selects on click and with the arrow keys", () => {
    const onChange = vi.fn();
    render(<GlassTabs label="Application settings" items={items} value="overview" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Credentials/ }));
    expect(onChange).toHaveBeenLastCalledWith("credentials");
    fireEvent.keyDown(screen.getByRole("tab", { name: /Overview/ }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("events");
  });

  it("publishes the measured slot as a px --lg-tab-width", () => {
    // glisse lays its lens copies out at --lg-tab-width; a percentage resolves against a
    // different box in each copy and scrambles the selected label, so GlassTabs must publish
    // pixels. The bar's 4px inset is read from glisse's stylesheet, so subtract it twice.
    const width = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(568);
    render(<GlassTabs label="Application settings" items={items} value="overview" onChange={() => {}} />);
    const bar = document.querySelector<HTMLElement>(".lg-tab-bar");
    expect(bar?.style.getPropertyValue("--lg-tab-width")).toBe(`${(568 - 8) / items.length}px`);
    width.mockRestore();
  });

  it("marks itself disabled while a mutation is in flight", () => {
    render(<GlassTabs label="Application settings" items={items} value="overview" onChange={() => {}} disabled />);
    expect(screen.getByRole("tablist").getAttribute("aria-disabled")).toBe("true");
  });
});

describe("Toggle", () => {
  it("is a switch with a name and description", () => {
    render(<Toggle label="Reduce motion" description="Respect motion-sensitive preferences." value={false} onChange={() => {}} />);
    const toggle = screen.getByRole("switch", { name: "Reduce motion" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("reports the next value when flipped", () => {
    const onChange = vi.fn();
    render(<Toggle label="Haptic feedback" value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Haptic feedback" }));
    expect(onChange).toHaveBeenLastCalledWith(true);
  });
});
