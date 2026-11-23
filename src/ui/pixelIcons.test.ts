import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PIXEL_ICONS, PIXEL_ICON_NAMES } from "./pixelIcons";
import { PixelIcon, pixelPath } from "./PixelIcon";

/** Glyphs that are drawn symmetrically about the vertical axis; a typo shows up here. */
const SYMMETRIC = ["home", "grid", "user", "gear", "bell", "plus", "shield", "sun", "lock", "trash", "eye", "mail", "calendar", "save"] as const;

describe("Ace ID pixel icon set", () => {
  it("keeps every glyph on the shared 24 x 24 grid", () => {
    for (const name of PIXEL_ICON_NAMES) {
      const rows = PIXEL_ICONS[name];
      expect(rows, name).toHaveLength(24);
      for (const row of rows) {
        expect(row, name).toHaveLength(24);
        expect(row, name).toMatch(/^[#.]+$/);
      }
    }
  });

  it("carries the bold Ace ID stroke weight without empty or solid tiles", () => {
    for (const name of PIXEL_ICON_NAMES) {
      const ink = PIXEL_ICONS[name].join("").split("").filter((cell) => cell === "#").length;
      const density = ink / 576;
      expect(density, name).toBeGreaterThan(0.1);
      expect(density, name).toBeLessThan(0.7);
    }
  });

  it("draws its symmetric glyphs symmetrically", () => {
    for (const name of SYMMETRIC) {
      const rows = PIXEL_ICONS[name];
      expect(rows, name).toEqual(rows.map((row) => [...row].reverse().join("")));
    }
  });

  it("provides every glyph the console shell asks for", () => {
    const required = ["home", "grid", "chart", "clock", "user", "gear", "search", "close", "chevron-down", "exchange", "external-link", "logout"] as const;
    for (const name of required) expect(PIXEL_ICON_NAMES).toContain(name);
  });
});

describe("pixelPath", () => {
  it("merges horizontal runs into one rectangle per run", () => {
    expect(pixelPath(["##..", "...#"])).toBe("M0 0h2v1h-2zM3 1h1v1h-1z");
  });

  it("produces nothing for an empty grid", () => {
    expect(pixelPath(["....", "...."])).toBe("");
  });

  it("covers every inked cell of a glyph", () => {
    const path = pixelPath(PIXEL_ICONS.gear);
    const painted = [...path.matchAll(/h(\d+)v1h-\d+z/g)].reduce((total, match) => total + Number(match[1]), 0);
    const ink = PIXEL_ICONS.gear.join("").split("").filter((cell) => cell === "#").length;
    expect(painted).toBe(ink);
  });
});

describe("PixelIcon", () => {
  it("renders a crisp, themeable, decorative svg by default", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "home" }));
    expect(markup).toContain('shape-rendering="crispEdges"');
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("role=");
  });

  it("exposes an accessible name when one is provided", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "gear", size: 22, label: "Settings" }));
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Settings"');
    expect(markup).toContain('width="22"');
    expect(markup).not.toContain("aria-hidden");
  });
});
