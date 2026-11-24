import type { SVGProps } from "react";
import {
  Activity,
  Clock,
  DataTransferBoth,
  GraphUp,
  Home,
  Key,
  List,
  LogOut,
  NavArrowDown,
  NavArrowRight,
  OpenNewWindow,
  Palette,
  Plus,
  Search,
  Settings,
  Shield,
  User,
  ViewGrid,
  Xmark
} from "iconoir-react";

/**
 * Semantic names used across the console, mapped to Iconoir glyphs.
 *
 * Iconoir is a 24px stroke set with one consistent weight, so a single icon family covers the
 * navigation, the account sheet, search fields and the application drawer. `filled` thickens
 * the stroke instead of swapping to a solid variant: the outline set has no solid twins for
 * the navigation glyphs, and a heavier stroke reads as "current" without changing shape.
 */
export const ICONS = {
  home: Home,
  grid: ViewGrid,
  chart: GraphUp,
  pulse: Activity,
  user: User,
  gear: Settings,
  clock: Clock,
  list: List,
  key: Key,
  palette: Palette,
  shield: Shield,
  search: Search,
  plus: Plus,
  close: Xmark,
  "chevron-down": NavArrowDown,
  "chevron-right": NavArrowRight,
  exchange: DataTransferBoth,
  "external-link": OpenNewWindow,
  logout: LogOut
} as const;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  /** Names the glyph for assistive technology. Omit for decorative icons. */
  label?: string;
  /** Heavier stroke for the selected destination. */
  filled?: boolean;
};

/** Renders an Iconoir glyph in the current text colour. */
export function Icon({ name, size = 24, className, label, filled = false }: IconProps) {
  const Glyph = ICONS[name];
  const props: SVGProps<SVGSVGElement> = {
    className: ["icon", className].filter(Boolean).join(" "),
    width: size,
    height: size,
    strokeWidth: filled ? 2.4 : 1.7,
    role: label ? "img" : undefined,
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    focusable: "false"
  };
  return <Glyph {...props} />;
}
