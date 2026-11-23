import { PIXEL_ICONS, type PixelIconName } from "./pixelIcons";

/**
 * Turns a 24 x 24 bitmap into a single SVG path, merging horizontal runs so each icon
 * ships as one compact `<path>` instead of dozens of `<rect>` nodes.
 */
export function pixelPath(rows: readonly string[]): string {
  const commands: string[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "#") { x += 1; continue; }
      let end = x;
      while (end + 1 < row.length && row[end + 1] === "#") end += 1;
      const width = end - x + 1;
      commands.push(`M${x} ${y}h${width}v1h-${width}z`);
      x = end + 1;
    }
  });
  return commands.join("");
}

const pathCache = new Map<PixelIconName, string>();

function pathFor(name: PixelIconName): string {
  const cached = pathCache.get(name);
  if (cached !== undefined) return cached;
  const path = pixelPath(PIXEL_ICONS[name]);
  pathCache.set(name, path);
  return path;
}

export type PixelIconProps = {
  name: PixelIconName;
  /** Rendered square size in CSS pixels. 24 and 36 (multiples of the grid) stay perfectly crisp. */
  size?: number;
  className?: string;
  /** Accessible name. Omit when the icon sits next to visible text. */
  label?: string;
};

/**
 * Ace ID's pixel icon. Draws the shared 24 x 24 glyph with crisp, un-antialiased cells so the
 * icon keeps its squared-off character at every size and in both themes.
 */
export function PixelIcon({ name, size = 24, className, label }: PixelIconProps) {
  return (
    <svg
      className={className ? `pixel-icon ${className}` : "pixel-icon"}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      shapeRendering="crispEdges"
      focusable="false"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={pathFor(name)} />
    </svg>
  );
}
