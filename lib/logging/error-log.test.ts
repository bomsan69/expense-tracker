import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { logError } = await import("./error-log");

let tmpDir: string;
let originalCwd: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tmpDir = mkdtempSync(join(tmpdir(), "error-log-test-"));
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  rmSync(tmpDir, { recursive: true, force: true });
});

function readTodayLog(): string[] {
  const date = new Date().toISOString().slice(0, 10);
  const content = readFileSync(join(tmpDir, "logs", `${date}.log`), "utf8");
  return content.trim().split("\n");
}

describe("logError", () => {
  it("creates the logs directory and writes one JSON line with message, stack, and context", () => {
    logError(new Error("boom"), { path: "/expenses/new", method: "POST" });

    const lines = readTodayLog();
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] as string);
    expect(entry.message).toBe("boom");
    expect(entry.stack).toContain("boom");
    expect(entry.path).toBe("/expenses/new");
    expect(entry.method).toBe("POST");
    expect(typeof entry.timestamp).toBe("string");
  });

  it("stringifies a non-Error value instead of throwing", () => {
    logError("a plain string failure");

    const lines = readTodayLog();
    const entry = JSON.parse(lines[0] as string);
    expect(entry.message).toBe("a plain string failure");
    expect(entry.stack).toBeUndefined();
  });

  it("appends multiple errors to the same day's file", () => {
    logError(new Error("first"));
    logError(new Error("second"));

    const lines = readTodayLog();
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] as string).message).toBe("first");
    expect(JSON.parse(lines[1] as string).message).toBe("second");
  });

  it("never throws, even if the log directory can't be created", () => {
    // Make `logs` unwritable by occupying its name with a file instead.
    writeFileSync(join(tmpDir, "logs"), "not a directory");

    expect(() => logError(new Error("should not throw"))).not.toThrow();
  });
});
