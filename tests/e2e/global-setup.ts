import { execSync } from "node:child_process";
import { startMockOpenAIServer } from "./mock-openai-server";

export const MOCK_OPENAI_PORT = 4010;

// E2E runs against TEST_DATABASE_URL (FLOW.md Phase 5), independent of
// whatever DATABASE_URL the gate's own `db:migrate`/`db:seed` lines target.
export default function globalSetup() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is not set");
  }
  const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL };
  execSync("npx drizzle-kit migrate", { env, stdio: "inherit" });
  execSync("npx tsx db/seed.ts", { env, stdio: "inherit" });

  const mockServer = startMockOpenAIServer(MOCK_OPENAI_PORT);
  return () => {
    mockServer.close();
  };
}
