import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { todayIso } from "@/lib/dates";
import {
  createCategory,
  getCategoryById,
  listCategories,
  renameCategory,
} from "./categories";
import {
  countExpenses,
  createExpense,
  deleteExpense,
  getExpenseById,
  listExpenses,
  sumExpenses,
  updateExpense,
} from "./expenses";
import { categoryBreakdownLastMonth, monthlyTotals } from "./stats";
import { createTestUser, deleteTestUser } from "./test-helpers";

let userA: number;
let userB: number;
let categoryA: number;
let categoryB: number;
let expenseA: number;

beforeEach(async () => {
  const a = await createTestUser();
  const b = await createTestUser();
  userA = a.id;
  userB = b.id;

  const catA = await createCategory(userA, "Food");
  const catB = await createCategory(userB, "Food");
  if (!catA.ok || !catB.ok) throw new Error("setup failed");
  categoryA = catA.category.id;
  categoryB = catB.category.id;

  const expense = await createExpense(userA, {
    spentOn: todayIso(),
    categoryId: categoryA,
    merchant: "User A's expense",
    amountMinor: 5000,
    person: "husband",
  });
  expenseA = expense.id;

  // Give B an expense too, so "B sees nothing of A's" is a real exclusion,
  // not just an empty table.
  await createExpense(userB, {
    spentOn: todayIso(),
    categoryId: categoryB,
    merchant: "User B's expense",
    amountMinor: 1,
    person: "husband",
  });
});

afterEach(async () => {
  await deleteTestUser(userA);
  await deleteTestUser(userB);
});

describe("cross-tenant isolation", () => {
  it("excludes A's rows from B's expense list", async () => {
    const filter = { from: todayIso(), to: todayIso() };
    const bList = await listExpenses(userB, filter, 1);
    expect(bList.every((e) => e.userId === userB)).toBe(true);
    expect(bList.some((e) => e.id === expenseA)).toBe(false);
  });

  it("excludes A's amount from B's count and sum", async () => {
    const filter = { from: todayIso(), to: todayIso() };
    expect(await countExpenses(userB, filter)).toBe(1);
    expect(await sumExpenses(userB, filter)).toBe(1);
  });

  it("returns not-found (null), never A's data, when B reads A's expense by id", async () => {
    expect(await getExpenseById(userB, expenseA)).toBeNull();
  });

  it("affects 0 rows and reports not-found when B updates A's expense", async () => {
    const result = await updateExpense(userB, expenseA, {
      spentOn: todayIso(),
      categoryId: categoryB,
      merchant: "Hijacked",
      amountMinor: 1,
      person: "husband",
    });
    expect(result).toBeNull();
    // A's row must be untouched.
    const stillA = await getExpenseById(userA, expenseA);
    expect(stillA?.merchant).toBe("User A's expense");
  });

  it("affects 0 rows and reports not-found when B deletes A's expense", async () => {
    const result = await deleteExpense(userB, expenseA);
    expect(result).toBe(false);
    const stillA = await getExpenseById(userA, expenseA);
    expect(stillA).not.toBeNull();
  });

  it("excludes A's category from B's category list", async () => {
    const bCategories = await listCategories(userB);
    expect(bCategories.every((c) => c.userId === userB)).toBe(true);
    expect(bCategories.some((c) => c.id === categoryA)).toBe(false);
  });

  it("returns null when B reads A's category by id", async () => {
    expect(await getCategoryById(userB, categoryA)).toBeNull();
  });

  it("reports not_found when B renames A's category", async () => {
    const result = await renameCategory(userB, categoryA, "Hijacked");
    expect(result).toEqual({ ok: false, error: "not_found" });
    const stillA = await getCategoryById(userA, categoryA);
    expect(stillA?.name).toBe("Food");
  });

  it("excludes A's amounts entirely from B's monthlyTotals", async () => {
    const totals = await monthlyTotals(userB);
    const grandTotal = totals.reduce((acc, t) => acc + t.totalMinor, 0);
    // Only B's 1-cent expense should be visible anywhere in B's totals.
    expect(grandTotal).toBe(1);
  });

  it("excludes A's amounts entirely from B's categoryBreakdownLastMonth", async () => {
    // A's and B's expenses are dated today (current month), so last month's
    // breakdown for B should be empty either way, and must never include A.
    const breakdown = await categoryBreakdownLastMonth(userB);
    expect(breakdown.some((b) => b.categoryId === categoryA)).toBe(false);
  });
});
