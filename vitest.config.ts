import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional (e.g. CI supplies real env vars directly)
}

const EXCLUDE = ["**/node_modules/**", "tests/e2e/**", "**/.next/**"];

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        plugins: [react()],
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          // .tsx tests render components/pages; .ts tests are server-side
          // logic (actions, queries) and belong to the "node" project below.
          include: ["components/**/*.test.tsx", "app/**/*.test.tsx"],
          exclude: EXCLUDE,
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "node",
          environment: "node",
          include: ["db/**/*.test.ts", "lib/**/*.test.ts", "app/**/*.test.ts"],
          exclude: EXCLUDE,
          env: {
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
            SESSION_SECRET: process.env.SESSION_SECRET ?? "",
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "",
            SEED_USER_EMAIL: process.env.SEED_USER_EMAIL ?? "",
            SEED_USER_PASSWORD: process.env.SEED_USER_PASSWORD ?? "",
          },
        },
      },
    ],
  },
});
