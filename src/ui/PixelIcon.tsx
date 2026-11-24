import type { CSSProperties } from "react";
import { PIXEL_ICON_GLYPHS, type PixelIconName } from "./pixelIcons";

export type PixelIconProps = { name: PixelIconName; size?: number; className?: string; label?: string; /** Uses the library's solid glyph, e.g. for the current tab. */ filled?: boolean };

/** Renders a glyph from HackerNoon's Pixel Icon Library; it inherits the surrounding text colour. */
export function PixelIcon({ name, size = 24, className, label, filled = false }: PixelIconProps) {
  const style: CSSProperties = { fontSize: size, width: size, height: size };
  return <i
    className={`pixel-icon hn hn-${PIXEL_ICON_GLYPHS[name]}${filled ? "-solid" : ""}${className ? ` ${className}` : ""}`}
    style={style}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true} />;
}
