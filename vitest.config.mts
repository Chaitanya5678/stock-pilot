import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./vitest.global-setup.ts",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    // Integration tests share one real Postgres database and truncate
    // tables between tests (src/test/resetDatabase.ts) — running files in
    // parallel would race on that shared state.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
