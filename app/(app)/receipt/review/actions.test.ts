import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { signSessionToken } from "@/lib/auth/session";
import { createCategory } from "@/lib/queries/categories";
import { countExpenses } from "@/lib/queries/expenses";
import { createTestUser, deleteTestUser } from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";
import { todayIso } from "@/lib/dates";

function todaysLogLines(): string[] {
  const date = new Date().toISOString().slice(0, 10);
  const path = join(process.cwd(), "logs", `${date}.log`);
  try {
    return readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// Other test files run concurrently in separate vitest workers and append
// to this same shared logs/<date>.log file, so filter to this module's own
// `action` tag to isolate from that cross-file interleaving.
function newSaveBatchLogLines(linesBefore: number): Record<string, unknown>[] {
  return todaysLogLines()
    .slice(linesBefore)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((entry) => entry.action === "saveBatchAction");
}

const cookieJar = createMockCookieJar();
const mockRedirect = vi.fn(createMockRedirect());

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { saveBatchAction } = await import("./actions");

let userId: number;
let categoryId: number;

beforeEach(async () => {
  mockRedirect.mockClear();
  const user = await createTestUser();
  userId = user.id;
  const category = await createCategory(userId, "Food");
  if (!category.ok) throw new Error("setup failed");
  categoryId = category.category.id;
  const token = await signSessionToken({ userId, tokenVersion: 0 });
  cookieJar.jar.set("session", token);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("saveBatchAction", () => {
  it("writes every row atomically and redirects home", async () => {
    await expect(
      saveBatchAction([
        {
          spentOn: todayIso(),
          categoryId: String(categoryId),
          merchant: "A",
          amountMinor: "10.00",
        },
        {
          spentOn: todayIso(),
          categoryId: String(categoryId),
          merchant: "B",
          amountMinor: "20.00",
        },
      ]),
    ).rejects.toThrow("/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(
      await countExpenses(userId, { from: todayIso(), to: todayIso() }),
    ).toBe(2);
  });

  it("disables save and writes nothing for an empty draft", async () => {
    const result = await saveBatchAction([]);
    expect(result).toEqual({
      ok: false,
      error: "Nothing was saved. Fix the highlighted rows and try again.",
    });
  });

  it("blocks save and names the offending row without writing anything", async () => {
    const result = await saveBatchAction([
      {
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Good row",
        amountMinor: "10.00",
      },
      {
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Bad row",
        amountMinor: "0",
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rowErrors).toEqual([null, "Enter an amount greater than 0."]);
    }
    expect(
      await countExpenses(userId, { from: todayIso(), to: todayIso() }),
    ).toBe(0);
  });

  it("rolls back the whole batch on a DB-level failure, preserving nothing written, and logs the real cause", async () => {
    const other = await createTestUser();
    const otherCategory = await createCategory(other.id, "Not yours");
    if (!otherCategory.ok) throw new Error("setup failed");

    const linesBefore = todaysLogLines().length;
    const result = await saveBatchAction([
      {
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Valid",
        amountMinor: "10.00",
      },
      {
        spentOn: todayIso(),
        categoryId: String(otherCategory.category.id),
        merchant: "Invalid category",
        amountMinor: "10.00",
      },
    ]);
    expect(result).toEqual({
      ok: false,
      error: "Nothing was saved. Fix the highlighted rows and try again.",
    });
    expect(
      await countExpenses(userId, { from: todayIso(), to: todayIso() }),
    ).toBe(0);

    // The generic message above is all the user sees — this is the only
    // trail of what actually went wrong.
    const newLines = newSaveBatchLogLines(linesBefore);
    expect(newLines).toHaveLength(1);
    expect(newLines[0]?.userId).toBe(userId);
    expect(typeof newLines[0]?.message).toBe("string");

    await deleteTestUser(other.id);
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      saveBatchAction([
        {
          spentOn: todayIso(),
          categoryId: String(categoryId),
          merchant: "A",
          amountMinor: "10.00",
        },
      ]),
    ).rejects.toThrow("/login");
  });
});
