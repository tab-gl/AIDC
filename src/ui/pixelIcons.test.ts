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
      expect(PIXEL_ICON_INDEX[name], name).toBeLessThan(49);
    }
  });
  it("keeps existing shell icon names compatible", () => {
    for (const name of ["home", "grid", "chart", "clock", "user", "gear", "search", "close", "chevron-down", "exchange", "external-link", "logout"])
      expect(PIXEL_ICON_NAMES).toContain(name);
  });
  it("renders a themeable sprite mask and remains decorative by default", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "home" }));
    expect(markup).toContain("mask-image"); expect(markup).toContain("currentColor");
    expect(markup).toContain('aria-hidden="true"'); expect(markup).not.toContain("role=");
  });
  it("exposes an accessible name when one is provided", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "gear", size: 22, label: "Settings" }));
    expect(markup).toContain('role="img"'); expect(markup).toContain('aria-label="Settings"');
    expect(markup).toContain("width:22px");
  });
});
