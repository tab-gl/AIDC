import type { DetailedHTMLProps, HTMLAttributes } from "react";
type El<T = object> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & T;
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "m3e-theme": El<{ color?: string; variant?: "monochrome" | "neutral"; scheme?: "auto" | "light" | "dark" }>;
      "m3e-loading-indicator": El<{ variant?: "uncontained" | "contained"; "pull-progress"?: number }>;
    }
  }
}
