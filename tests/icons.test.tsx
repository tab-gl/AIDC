import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as iconoir from "iconoir-react";
import { ICONS, Icon } from "../src/ui/Icon";

describe("Iconoir icon set", () => {
  it("maps every semantic name to an Iconoir export", () => {
    for (const [name, glyph] of Object.entries(ICONS)) {
      expect(glyph, name).toBeTruthy();
      expect(Object.values(iconoir), name).toContain(glyph);
    }
  });

  it("keeps the names the two shells and the account sheet rely on", () => {
    for (const name of ["home", "grid", "chart", "pulse", "plus", "clock", "user", "gear", "search", "close", "chevron-down", "exchange", "external-link", "logout", "key", "palette", "list", "shield"])
      expect(Object.keys(ICONS)).toContain(name);
  });

  it("renders a decorative, themeable SVG glyph by default", () => {
    const markup = renderToStaticMarkup(createElement(Icon, { name: "home" }));
    expect(markup).toContain("<svg");
    expect(markup).toContain('class="icon"');
    expect(markup).toContain('width="24"');
    expect(markup).toContain('height="24"');
    expect(markup).toContain('stroke-width="1.7"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
  });

  it("exposes an accessible name when one is provided", () => {
    const markup = renderToStaticMarkup(createElement(Icon, { name: "gear", size: 22, label: "Settings", className: "sheet-row-caret" }));
    expect(markup).toContain('class="icon sheet-row-caret"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Settings"');
    expect(markup).toContain('width="22"');
    expect(markup).not.toContain('aria-hidden');
  });

  it("thickens the stroke for the selected destination", () => {
    const idle = renderToStaticMarkup(createElement(Icon, { name: "grid" }));
    const selected = renderToStaticMarkup(createElement(Icon, { name: "grid", filled: true }));
    expect(idle).toContain('stroke-width="1.7"');
    expect(selected).toContain('stroke-width="2.4"');
  });
});
