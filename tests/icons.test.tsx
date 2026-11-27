import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ICONS, Icon } from "../src/ui/Icon";

describe("Solar icon set", () => {
  it("maps every semantic name to an outline and a bold Solar glyph", () => {
    for (const [name, pair] of Object.entries(ICONS)) {
      expect(pair.outline, `${name} outline`).toBeTruthy();
      expect(pair.bold, `${name} bold`).toBeTruthy();
      expect(pair.outline, name).not.toBe(pair.bold);
    }
  });

  it("keeps the names the two shells and the account sheet rely on", () => {
    for (const name of ["home", "grid", "chart", "pulse", "plus", "clock", "user", "gear", "search", "close", "chevron-down", "exchange", "external-link", "logout", "key", "palette", "list", "shield"])
      expect(Object.keys(ICONS)).toContain(name);
  });

  it("renders a decorative outline SVG by default", () => {
    const markup = renderToStaticMarkup(createElement(Icon, { name: "home" }));
    expect(markup).toContain("<svg");
    expect(markup).toMatch(/class="[^"]*\bicon\b/);
    expect(markup).toContain("width:24px");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
  });

  it("exposes an accessible name when one is provided", () => {
    const markup = renderToStaticMarkup(createElement(Icon, { name: "gear", size: 22, label: "Settings", className: "sheet-row-caret" }));
    expect(markup).toContain("sheet-row-caret");
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Settings"');
    expect(markup).toContain("width:22px");
    expect(markup).not.toContain('aria-hidden');
  });

  it("swaps to the solid bold glyph for the selected destination", () => {
    const idle = renderToStaticMarkup(createElement(Icon, { name: "grid" }));
    const selected = renderToStaticMarkup(createElement(Icon, { name: "grid", filled: true }));
    expect(selected).not.toBe(idle);
    expect(selected).toContain("<svg");
  });
});
