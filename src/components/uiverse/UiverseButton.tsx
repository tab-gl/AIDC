import type { ButtonHTMLAttributes } from "react";

/* Uiverse component wrapper. Original interaction: 1osm, Uiverse Galaxy.
   Source: https://github.com/uiverse-io/galaxy/blob/main/Buttons/1osm_black-chicken-65.html
   The source CSS is adapted to AIDC's monochrome design tokens in uiverse-button.css. */
type UiverseButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function UiverseButton({ className = "", type = "button", ...props }: UiverseButtonProps) {
  return <button type={type} className={["uiverse-button", className].filter(Boolean).join(" ")} {...props} />;
}
