import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["e2e/**", "test/**", "node_modules/**", "dist/**", "dist-server/**"]
  }
});
