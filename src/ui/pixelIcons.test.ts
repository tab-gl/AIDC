import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PIXEL_ICON_INDEX, PIXEL_ICON_NAMES } from "./pixelIcons";
import { PixelIcon } from "./PixelIcon";

describe("AIDC pixel icon sheet", () => {
  it("maps all 48 supplied glyphs to valid sprite cells", () => {
    expect(new Set(Object.values(PIXEL_ICON_INDEX)).size).toBe(48);
    for (const name of PIXEL_ICON_NAMES) {
      expect(PIXEL_ICON_INDEX[name], name).toBeGreaterThanOrEqual(0);
      expect(PIXEL_ICON_INDEX[name], name).toBeLessThan(56);
    }
  });
  it("uses the supplied 8-column, 7-row source order", () => {
    expect(PIXEL_ICON_INDEX.user).toBe(0);
    expect(PIXEL_ICON_INDEX["shield-key"]).toBe(1);
    expect(PIXEL_ICON_INDEX.fingerprint).toBe(32);
    expect(PIXEL_ICON_INDEX.pin).toBe(49);
    expect(PIXEL_ICON_INDEX.loader).toBe(55);
  });
  it("keeps existing shell icon names compatible", () => {
    for (const name of ["home", "grid", "chart", "clock", "user", "gear", "search", "close", "chevron-down", "exchange", "external-link", "logout"])
      expect(PIXEL_ICON_NAMES).toContain(name);
  });
  it("renders a crisp, themeable, decorative SVG by default", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "home" }));
    expect(markup).toContain('shape-rendering="crispEdges"');
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("mask-image");
    expect(markup).not.toContain("role=");
  });
  it("exposes an accessible name when one is provided", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "gear", size: 22, label: "Settings" }));
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Settings"');
    expect(markup).toContain('width="22"');
  });
});
