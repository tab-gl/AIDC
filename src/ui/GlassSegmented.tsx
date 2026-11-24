import { useId } from "react";
import { SegmentedControl } from "./glisse";

export type GlassChoice = { value: string; label: string };

type Props = {
  /** Visible label, and the group's accessible name. */
  label: string;
  /** Keeps the label for assistive technology only, for toolbars and page headers. */
  hideLabel?: boolean;
  options: GlassChoice[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/**
 * A glisse segmented control: a thumb on a glass track that lifts into a lens while it is
 * pressed or dragged between options. Arrow keys, Home and End move the selection, and the
 * group exposes the radiogroup/radio pattern.
 */
export function GlassSegmented({ label, hideLabel = false, options, value, onChange, className }: Props) {
  const id = useId();
  return <div className={["glass-choice", className].filter(Boolean).join(" ")}>
    <span id={id} className={hideLabel ? "glass-choice-label sr-only" : "glass-choice-label"}>{label}</span>
    <SegmentedControl
      aria-labelledby={id}
      className="glass-segmented"
      items={options}
      value={value}
      onValueChange={onChange}
    />
  </div>;
}
