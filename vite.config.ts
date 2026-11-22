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
    outDir: "dist"
  }
});
