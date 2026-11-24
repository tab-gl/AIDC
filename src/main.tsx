import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@astryxdesign/theme-neutral/fonts.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "@m3e/web/theme";
import "@m3e/web/loading-indicator";
import "@m3e/web/switch";
import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
import "./app.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
