// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Landing } from "./Landing";

beforeEach(() => {
  // motion.dev's viewport reveal needs IntersectionObserver; jsdom has no layout engine.
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  globalThis.IntersectionObserver = Observer as never;
  globalThis.ResizeObserver = Observer as never;
});

afterEach(cleanup);

describe("landing shell", () => {
  it("puts the primary navigation on the ReactBits glass surface", () => {
    const { container } = render(<Landing onSignIn={vi.fn()} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeTruthy();
    const glass = container.querySelector(".glass-surface");
    expect(glass).toBeTruthy();
    expect(glass?.contains(nav)).toBe(true);
    expect(container.querySelector(".glass-surface feImage")).toBeTruthy();
  });

  it("offers sign in and the documentation without leaving the page first", () => {
    const onSignIn = vi.fn();
    render(<Landing onSignIn={onSignIn} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
    const docs = screen.getByRole("link", { name: "Documentation" });
    expect(docs.getAttribute("href")).toContain("docs.ace-base.cc");
    expect(screen.getByRole("link", { name: "Skip to content" }).getAttribute("href")).toBe("#landing-main");
  });
});
