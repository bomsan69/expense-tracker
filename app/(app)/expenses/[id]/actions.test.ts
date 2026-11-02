import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSessionToken } from "@/lib/auth/session";
import { createCategory } from "@/lib/queries/categories";
import { createExpense, getExpenseById } from "@/lib/queries/expenses";
import { createTestUser, deleteTestUser } from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";
import { todayIso } from "@/lib/dates";

const cookieJar = createMockCookieJar();
const mockRedirect = vi.fn(createMockRedirect());

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { getExpenseAction, updateExpenseAction, deleteExpenseAction } =
  await import("./actions");

let userId: number;
let categoryId: number;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

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

describe("getExpenseAction", () => {
  it("returns the expense scoped to the session user", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Trader Joe's",
      amountMinor: 1000,
    });
    const result = await getExpenseAction(expense.id);
    expect(result).toEqual({ ok: true, data: expense });
  });

  it("returns not found for a missing id", async () => {
    const result = await getExpenseAction(9_999_999);
    expect(result).toEqual({ ok: false, error: "Expense not found." });
  });

  it("returns not found (never forbidden) for another user's expense", async () => {
    const other = await createTestUser();
    const otherCategory = await createCategory(other.id, "Food");
    if (!otherCategory.ok) throw new Error("setup failed");
    const otherExpense = await createExpense(other.id, {
      spentOn: todayIso(),
      categoryId: otherCategory.category.id,
      merchant: "Not yours",
      amountMinor: 500,
    });

    const result = await getExpenseAction(otherExpense.id);
    expect(result).toEqual({ ok: false, error: "Expense not found." });
    await deleteTestUser(other.id);
  });
});

describe("updateExpenseAction", () => {
  it("updates the expense", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Original",
      amountMinor: 1000,
    });
    const result = await updateExpenseAction(
      expense.id,
      undefined,
      formData({
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Updated",
        amountMinor: "20.00",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.merchant).toBe("Updated");
  });

  it("rejects an invalid amount, preserving the stored record", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Original",
      amountMinor: 1000,
    });
    const result = await updateExpenseAction(
      expense.id,
      undefined,
      formData({
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Updated",
        amountMinor: "0",
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Enter an amount greater than 0.",
    });
    const stillOriginal = await getExpenseById(userId, expense.id);
    expect(stillOriginal?.merchant).toBe("Original");
  });

  it("rejects updating another user's expense with not found, and leaves it untouched", async () => {
    const other = await createTestUser();
    const otherCategory = await createCategory(other.id, "Food");
    if (!otherCategory.ok) throw new Error("setup failed");
    const otherExpense = await createExpense(other.id, {
      spentOn: todayIso(),
      categoryId: otherCategory.category.id,
      merchant: "Not yours",
      amountMinor: 500,
    });

    const result = await updateExpenseAction(
      otherExpense.id,
      undefined,
      formData({
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Hijacked",
        amountMinor: "1.00",
      }),
    );
    expect(result).toEqual({ ok: false, error: "Expense not found." });

    const stillOriginal = await getExpenseById(other.id, otherExpense.id);
    expect(stillOriginal?.merchant).toBe("Not yours");
    await deleteTestUser(other.id);
  });
});

describe("deleteExpenseAction", () => {
  it("deletes the expense and redirects home", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "To delete",
      amountMinor: 100,
    });
    await expect(deleteExpenseAction(expense.id)).rejects.toThrow("/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(await getExpenseById(userId, expense.id)).toBeNull();
  });

  it("rejects deleting another user's expense", async () => {
    const other = await createTestUser();
    const otherCategory = await createCategory(other.id, "Food");
    if (!otherCategory.ok) throw new Error("setup failed");
    const otherExpense = await createExpense(other.id, {
      spentOn: todayIso(),
      categoryId: otherCategory.category.id,
      merchant: "Not yours",
      amountMinor: 500,
    });

    const result = await deleteExpenseAction(otherExpense.id);
    expect(result).toEqual({ ok: false, error: "Expense not found." });
    expect(await getExpenseById(other.id, otherExpense.id)).not.toBeNull();
    await deleteTestUser(other.id);
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(deleteExpenseAction(1)).rejects.toThrow("/login");
  });
});
