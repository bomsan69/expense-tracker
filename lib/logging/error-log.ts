import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

function logDir(): string {
  return join(process.cwd(), "logs");
}

function todayLogPath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return join(logDir(), `${date}.log`);
}

// Server-side error log, one JSON line per error, rotated daily by filename.
// Never throws: a logging failure must never take down the request it's
// trying to diagnose. Callers pass only non-secret context (e.g. path,
// method) — never headers, cookies, or request bodies, which can carry the
// session token or a user's AI API key (SPEC.md §9).
export function logError(error: unknown, context?: Record<string, unknown>): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      stack,
      ...context,
    };
    mkdirSync(logDir(), { recursive: true });
    appendFileSync(todayLogPath(), `${JSON.stringify(entry)}\n`);
  } catch {
    // See above: swallow logging failures.
  }
}
