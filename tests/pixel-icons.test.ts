import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PIXEL_ICON_GLYPHS, PIXEL_ICON_NAMES } from "../src/ui/pixelIcons";
import { PixelIcon } from "../src/ui/PixelIcon";

// Read the packaged stylesheet directly: Vitest stubs CSS imports, so `?raw` comes back empty.
const iconFontCss = readFileSync(
  new URL("../node_modules/@hackernoon/pixel-icon-library/fonts/iconfont.css", import.meta.url),
  "utf8"
);

describe("pixel icon library", () => {
  it("maps every semantic name to a glyph shipped by the package", () => {
    for (const name of PIXEL_ICON_NAMES) {
      const glyph = PIXEL_ICON_GLYPHS[name];
      expect(glyph, name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(iconFontCss.includes(`.hn-${glyph}:before`), `${name} -> ${glyph}`).toBe(true);
    }
  });

  it("keeps existing shell icon names compatible", () => {
    for (const name of ["home", "grid", "chart", "pulse", "plus", "clock", "user", "gear", "search", "close", "chevron-down", "exchange", "external-link", "logout"])
      expect(PIXEL_ICON_NAMES).toContain(name);
  });

  it("renders a themeable, decorative font glyph by default", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "home" }));
    expect(markup).toContain('class="pixel-icon hn hn-home"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("font-size:24px");
    expect(markup).not.toContain("role=");
  });

  it("exposes an accessible name when one is provided", () => {
    const markup = renderToStaticMarkup(createElement(PixelIcon, { name: "gear", size: 22, label: "Settings", className: "sheet-row-caret" }));
    expect(markup).toContain('class="pixel-icon hn hn-cog sheet-row-caret"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Settings"');
    expect(markup).toContain("font-size:22px");
  });
  it("ships a solid glyph for every navigation icon so the current tab can be filled", () => {
    for (const name of ["home", "grid", "chart", "pulse", "user", "gear"] as const) {
      const glyph = PIXEL_ICON_GLYPHS[name];
      expect(iconFontCss.includes(`.hn-${glyph}-solid:before`), `${name} -> ${glyph}-solid`).toBe(true);
      expect(renderToStaticMarkup(createElement(PixelIcon, { name, filled: true }))).toContain(`hn-${glyph}-solid`);
    }
  });
});
