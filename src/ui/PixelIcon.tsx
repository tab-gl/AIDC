import type { CSSProperties } from "react";
import { PIXEL_ICON_INDEX, type PixelIconName } from "./pixelIcons";

export type PixelIconProps = { name: PixelIconName; size?: number; className?: string; label?: string };

/** Renders the supplied monochrome pixel-art sprite without smoothing or external icon fonts. */
export function PixelIcon({ name, size = 24, className, label }: PixelIconProps) {
  const index = PIXEL_ICON_INDEX[name];
  const scale = size / 24;
  const columns = 8;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const style: CSSProperties = {
    maskImage: "url(/assets/pixel-icons.png)", WebkitMaskImage: "url(/assets/pixel-icons.png)",
    maskSize: `${192 * scale}px ${168 * scale}px`, WebkitMaskSize: `${192 * scale}px ${168 * scale}px`,
    maskPosition: `${-column * 24 * scale}px ${-row * 24 * scale}px`, WebkitMaskPosition: `${-column * 24 * scale}px ${-row * 24 * scale}px`,
    maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", imageRendering: "pixelated"
  };
  return <svg xmlns="http://www.w3.org/2000/svg" className={className ? `pixel-icon ${className}` : "pixel-icon"}
    width={size} height={size} viewBox="0 0 24 24" style={style} shapeRendering="crispEdges"
    role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <rect width="24" height="24" fill="currentColor" />
  </svg>;
}
