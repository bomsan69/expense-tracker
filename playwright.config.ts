import { defineConfig } from "@playwright/test";
import { MOCK_ANTHROPIC_PORT } from "./tests/e2e/global-setup";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional (e.g. CI supplies real env vars directly)
}

export default defineConfig({
  testDir: "./tests/e2e",
  // Specs share one seeded database; run fully sequentially to avoid
  // cross-test interference over that shared state.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 390, height: 844 },
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      ANTHROPIC_BASE_URL: `http://localhost:${MOCK_ANTHROPIC_PORT}`,
    },
  },
});
