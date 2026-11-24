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
          // The vendored Glass Surface is only needed by the landing navbar and the phone bar.
          // Keeping it in its own chunk lets the desktop shell reuse a cached copy instead of
          // re-downloading it with the app shell on every deploy.
          if (id.includes("/src/ui/GlassSurface")) return "glass";
          // glisse only renders inside lazy views, so its chunk must not be preloaded with the
          // shell. The Iconoir glyphs are needed by both shells, so they get their own chunk.
          if (id.includes("/node_modules/glisse/")) return "glisse";
          if (id.includes("/node_modules/iconoir-react/")) return "icons";
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
