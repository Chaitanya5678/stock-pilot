import { defineConfig, devices } from "@playwright/test";

// One-off E2E coverage for the critical workflow (docs/ARCHITECTURE.md §5):
// login -> inventory -> movement -> updated balance -> history entry.
// Intentionally not a large suite — see docs/DECISIONS.md for scope.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
