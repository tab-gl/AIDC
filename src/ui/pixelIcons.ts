// Semantic icon names used across the console, mapped to glyphs from
// @hackernoon/pixel-icon-library. Each value is the package's icon-font suffix:
// it renders as `<i class="hn hn-<value>">` on a 24px grid.
//
// Only names the console renders are listed. The library has no key, shield or
// exchange glyph (its `cybersecurity`, `data-science` and friends are full-colour
// mascot illustrations, not UI icons), so the old sprite's key/shield names are
// gone rather than pointed at an unrelated padlock.
export const PIXEL_ICON_GLYPHS = {
  home: "home", grid: "grid", chart: "chart-line",
  // `trending` draws a growth arrow, which misreads as "revenue" on an event log;
  // the bolt is the library's closest activity marker.
  pulse: "bolt",
  user: "user", gear: "cog", clock: "clock",
  search: "search", plus: "plus", close: "times",
  "chevron-down": "chevron-down", exchange: "shuffle",
  "external-link": "external-link", logout: "logout"
} as const;
export type PixelIconName = keyof typeof PIXEL_ICON_GLYPHS;
export const PIXEL_ICON_NAMES = Object.keys(PIXEL_ICON_GLYPHS) as PixelIconName[];
