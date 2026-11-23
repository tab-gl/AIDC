import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".e2b.app"],
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000"
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Keep the framework and the two component libraries in their own long-lived chunks:
        // the app shell then only re-downloads what actually changed between deploys.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "react";
          if (id.includes("@m3e/")) return "m3e";
          if (id.includes("@astryxdesign/")) return "astryx";
          return "vendor";
        }
      }
    }
  }
});
