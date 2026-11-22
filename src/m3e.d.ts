import type { DetailedHTMLProps, HTMLAttributes } from "react";
type El<T = object> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & T;
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "m3e-theme": El;
      "m3e-switch": El<{ checked?: boolean; disabled?: boolean; name?: string }>;
      "m3e-loading-indicator": El<{ variant?: "default" | "contained" }>;
      "m3e-linear-progress-indicator": El<{ value?: number; max?: number; mode?: "determinate" | "indeterminate" }>;
    }
  }
}
