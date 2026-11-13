import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/auth": "http://localhost:3000"
    }
  },
  build: {
    outDir: "dist",
    rollupOptions: { output: { manualChunks(id) { if (!id.includes("node_modules")) return; if (/react-dom|scheduler|\/react\//.test(id)) return "react"; if (/motion|framer/.test(id)) return "motion"; if (/radix|floating-ui/.test(id)) return "radix"; } } }
  }
});
