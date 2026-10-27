import { defineConfig } from "vitest/config";
import path from "path";

const rootDir = import.meta.dirname ?? path.resolve(".");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    testTimeout: 20000,
  },
});
