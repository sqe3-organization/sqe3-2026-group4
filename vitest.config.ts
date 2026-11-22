import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@tests": path.resolve(import.meta.dirname, "./tests"),
    },
  },
  test: {
    globals: true,
    globalSetup: ["./tests/setup/log-run.ts"],
    setupFiles: ["./tests/setup/load-env.ts"],
  },
});
