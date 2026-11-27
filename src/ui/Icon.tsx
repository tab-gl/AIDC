import type { ComponentType } from "react";
import { HomeIcon as HomeOutline } from "@solar-icons/react/outline/home";
import { HomeIcon as HomeBold } from "@solar-icons/react/bold/home";
import { WidgetIcon as WidgetOutline } from "@solar-icons/react/outline/widget";
import { WidgetIcon as WidgetBold } from "@solar-icons/react/bold/widget";
import { GraphUpIcon as GraphUpOutline } from "@solar-icons/react/outline/graph-up";
import { GraphUpIcon as GraphUpBold } from "@solar-icons/react/bold/graph-up";
import { Pulse2Icon as PulseOutline } from "@solar-icons/react/outline/pulse-2";
import { Pulse2Icon as PulseBold } from "@solar-icons/react/bold/pulse-2";
import { UserIcon as UserOutline } from "@solar-icons/react/outline/user";
import { UserIcon as UserBold } from "@solar-icons/react/bold/user";
import { SettingsIcon as SettingsOutline } from "@solar-icons/react/outline/settings";
import { SettingsIcon as SettingsBold } from "@solar-icons/react/bold/settings";
import { ClockCircleIcon as ClockOutline } from "@solar-icons/react/outline/clock-circle";
import { ClockCircleIcon as ClockBold } from "@solar-icons/react/bold/clock-circle";
import { ListIcon as ListOutline } from "@solar-icons/react/outline/list";
import { ListIcon as ListBold } from "@solar-icons/react/bold/list";
import { KeyIcon as KeyOutline } from "@solar-icons/react/outline/key";
import { KeyIcon as KeyBold } from "@solar-icons/react/bold/key";
import { PaletteIcon as PaletteOutline } from "@solar-icons/react/outline/palette";
import { PaletteIcon as PaletteBold } from "@solar-icons/react/bold/palette";
import { ShieldCheckIcon as ShieldOutline } from "@solar-icons/react/outline/shield-check";
import { ShieldCheckIcon as ShieldBold } from "@solar-icons/react/bold/shield-check";
import { MagnifierIcon as SearchOutline } from "@solar-icons/react/outline/magnifier";
import { MagnifierIcon as SearchBold } from "@solar-icons/react/bold/magnifier";
import { AddIcon as PlusOutline } from "@solar-icons/react/outline/add";
import { AddIcon as PlusBold } from "@solar-icons/react/bold/add";
import { CloseIcon as CloseOutline } from "@solar-icons/react/outline/close";
import { CloseIcon as CloseBold } from "@solar-icons/react/bold/close";
import { AltArrowDownIcon as ChevronDownOutline } from "@solar-icons/react/outline/alt-arrow-down";
import { AltArrowDownIcon as ChevronDownBold } from "@solar-icons/react/bold/alt-arrow-down";
import { AltArrowRightIcon as ChevronRightOutline } from "@solar-icons/react/outline/alt-arrow-right";
import { AltArrowRightIcon as ChevronRightBold } from "@solar-icons/react/bold/alt-arrow-right";
import { TransferHorizontalIcon as ExchangeOutline } from "@solar-icons/react/outline/transfer-horizontal";
import { TransferHorizontalIcon as ExchangeBold } from "@solar-icons/react/bold/transfer-horizontal";
import { ExportIcon as ExternalLinkOutline } from "@solar-icons/react/outline/export";
import { ExportIcon as ExternalLinkBold } from "@solar-icons/react/bold/export";
import { LogoutIcon as LogoutOutline } from "@solar-icons/react/outline/logout";
import { LogoutIcon as LogoutBold } from "@solar-icons/react/bold/logout";

type Glyph = ComponentType<{ size?: number | string; className?: string; strokeWidth?: number; "aria-label"?: string; role?: string }>;

type GlyphPair = { outline: Glyph; bold: Glyph };

/**
 * Semantic names used across the console, mapped to Solar icons. Each name has an outline
 * variant (idle) and a bold, solid variant (`filled`, used for the selected destination).
 */
export const ICONS = {
  home: { outline: HomeOutline, bold: HomeBold },
  grid: { outline: WidgetOutline, bold: WidgetBold },
  chart: { outline: GraphUpOutline, bold: GraphUpBold },
  pulse: { outline: PulseOutline, bold: PulseBold },
  user: { outline: UserOutline, bold: UserBold },
  gear: { outline: SettingsOutline, bold: SettingsBold },
  clock: { outline: ClockOutline, bold: ClockBold },
  list: { outline: ListOutline, bold: ListBold },
  key: { outline: KeyOutline, bold: KeyBold },
  palette: { outline: PaletteOutline, bold: PaletteBold },
  shield: { outline: ShieldOutline, bold: ShieldBold },
  search: { outline: SearchOutline, bold: SearchBold },
  plus: { outline: PlusOutline, bold: PlusBold },
  close: { outline: CloseOutline, bold: CloseBold },
  "chevron-down": { outline: ChevronDownOutline, bold: ChevronDownBold },
  "chevron-right": { outline: ChevronRightOutline, bold: ChevronRightBold },
  exchange: { outline: ExchangeOutline, bold: ExchangeBold },
  "external-link": { outline: ExternalLinkOutline, bold: ExternalLinkBold },
  logout: { outline: LogoutOutline, bold: LogoutBold }
} satisfies Record<string, GlyphPair>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  /** Names the glyph for assistive technology. Omit for decorative icons. */
  label?: string;
  /** Solid bold variant for the selected destination; outline otherwise. */
  filled?: boolean;
};

/** Renders a Solar glyph (outline or bold) in the current text colour. */
export function Icon({ name, size = 24, className, label, filled = false }: IconProps) {
  const pair: GlyphPair = ICONS[name];
  const Glyph = filled ? pair.bold : pair.outline;
  return (
    <Glyph
      className={["icon", className].filter(Boolean).join(" ")}
      size={size}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
