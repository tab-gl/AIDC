import type { CSSProperties } from "react";
import { PIXEL_ICON_INDEX, type PixelIconName } from "./pixelIcons";

export type PixelIconProps = { name: PixelIconName; size?: number; className?: string; label?: string };

/** Renders a glyph from the exact supplied pixel-art sheet as a themeable alpha mask. */
export function PixelIcon({ name, size = 24, className, label }: PixelIconProps) {
  const index = PIXEL_ICON_INDEX[name];
  const scale = size / 24;
  const column = index % 7;
  const row = Math.floor(index / 7);
  const spriteSize = 168 * scale;
  const offset = 24 * scale;
  const style: CSSProperties = {
    display: "inline-block", width: size, height: size, flex: "0 0 auto",
    backgroundColor: "currentColor",
    maskImage: "url(/assets/pixel-icons.png)", WebkitMaskImage: "url(/assets/pixel-icons.png)",
    maskSize: `${spriteSize}px ${spriteSize}px`, WebkitMaskSize: `${spriteSize}px ${spriteSize}px`,
    maskPosition: `${-column * offset}px ${-row * offset}px`, WebkitMaskPosition: `${-column * offset}px ${-row * offset}px`,
    maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", imageRendering: "pixelated"
  };
  return <span className={className ? `pixel-icon ${className}` : "pixel-icon"} style={style}
    role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}
