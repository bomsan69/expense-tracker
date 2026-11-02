import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addDays, todayIso } from "@/lib/dates";
import { createCategory } from "./categories";
import {
  countExpenses,
  createExpense,
  createManyExpenses,
  deleteExpense,
  getExpenseById,
  listExpenses,
  sumExpenses,
  updateExpense,
} from "./expenses";
import { createTestUser, deleteTestUser } from "./test-helpers";

let userId: number;
let categoryId: number;
let otherCategoryId: number;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
  const category = await createCategory(userId, "Food");
  const otherCategory = await createCategory(userId, "Travel");
  if (!category.ok || !otherCategory.ok) throw new Error("setup failed");
  categoryId = category.category.id;
  otherCategoryId = otherCategory.category.id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("createExpense", () => {
  it("creates an expense for the user", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Trader Joe's",
      amountMinor: 4210,
      notes: "weekly groceries",
    });
    expect(expense.userId).toBe(userId);
    expect(expense.categoryId).toBe(categoryId);
    expect(expense.amountMinor).toBe(4210);
    expect(expense.notes).toBe("weekly groceries");
  });

  it("rejects a category that does not belong to the user", async () => {
    const otherUser = await createTestUser();
    const otherUserCategory = await createCategory(otherUser.id, "Someone else's");
    if (!otherUserCategory.ok) throw new Error("setup failed");
    await expect(
      createExpense(userId, {
        spentOn: todayIso(),
        categoryId: otherUserCategory.category.id,
        merchant: "Shop",
        amountMinor: 100,
      }),
    ).rejects.toThrow();
    await deleteTestUser(otherUser.id);
  });
});

describe("listExpenses / countExpenses / sumExpenses", () => {
  it("filters by date range and category, and paginates 10 per page newest first", async () => {
    const today = todayIso();
    // 15 expenses within range, on distinct dates so ordering is unambiguous.
    for (let i = 0; i < 15; i++) {
      await createExpense(userId, {
        spentOn: addDays(today, -i),
        categoryId,
        merchant: `Merchant ${i}`,
        amountMinor: 100 + i,
      });
    }
    // One outside the range and one in a different category: must be excluded.
    await createExpense(userId, {
      spentOn: addDays(today, -40),
      categoryId,
      merchant: "Too old",
      amountMinor: 999,
    });
    await createExpense(userId, {
      spentOn: today,
      categoryId: otherCategoryId,
      merchant: "Wrong category",
      amountMinor: 999,
    });

    const filter = { from: addDays(today, -14), to: today, categoryId };
    const total = await countExpenses(userId, filter);
    expect(total).toBe(15);

    const page1 = await listExpenses(userId, filter, 1);
    expect(page1).toHaveLength(10);
    expect(page1[0]?.merchant).toBe("Merchant 0");
    expect(page1[9]?.merchant).toBe("Merchant 9");

    const page2 = await listExpenses(userId, filter, 2);
    expect(page2).toHaveLength(5);
    expect(page2[0]?.merchant).toBe("Merchant 10");

    const expectedSum = Array.from({ length: 15 }, (_, i) => 100 + i).reduce(
      (a, b) => a + b,
      0,
    );
    expect(await sumExpenses(userId, filter)).toBe(expectedSum);
  });

  it("returns 0 for an empty result set", async () => {
    const today = todayIso();
    const filter = { from: today, to: today, categoryId };
    expect(await countExpenses(userId, filter)).toBe(0);
    expect(await sumExpenses(userId, filter)).toBe(0);
    expect(await listExpenses(userId, filter, 1)).toEqual([]);
  });
});

describe("updateExpense", () => {
  it("updates the row and preserves the id", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Original",
      amountMinor: 1000,
    });
    const updated = await updateExpense(userId, expense.id, {
      spentOn: todayIso(),
      categoryId: otherCategoryId,
      merchant: "Updated",
      amountMinor: 2000,
    });
    expect(updated?.id).toBe(expense.id);
    expect(updated?.merchant).toBe("Updated");
    expect(updated?.categoryId).toBe(otherCategoryId);
    expect(updated?.amountMinor).toBe(2000);
  });

  it("returns null and performs no update for a nonexistent id", async () => {
    const result = await updateExpense(userId, 9_999_999, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Nope",
      amountMinor: 100,
    });
    expect(result).toBeNull();
  });

  it("is a no-op-safe re-save: saving identical values still returns the row", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "Same",
      amountMinor: 500,
    });
    const resaved = await updateExpense(userId, expense.id, {
      spentOn: expense.spentOn,
      categoryId: expense.categoryId,
      merchant: expense.merchant,
      amountMinor: expense.amountMinor,
    });
    expect(resaved?.id).toBe(expense.id);
  });
});

describe("deleteExpense", () => {
  it("deletes an existing row and reports true", async () => {
    const expense = await createExpense(userId, {
      spentOn: todayIso(),
      categoryId,
      merchant: "To delete",
      amountMinor: 100,
    });
    expect(await deleteExpense(userId, expense.id)).toBe(true);
    expect(await getExpenseById(userId, expense.id)).toBeNull();
  });

  it("reports false for a nonexistent row", async () => {
    expect(await deleteExpense(userId, 9_999_999)).toBe(false);
  });
});

describe("createManyExpenses", () => {
  it("writes every row atomically", async () => {
    const today = todayIso();
    const created = await createManyExpenses(userId, [
      { spentOn: today, categoryId, merchant: "A", amountMinor: 100 },
      { spentOn: today, categoryId, merchant: "B", amountMinor: 200 },
      { spentOn: today, categoryId, merchant: "C", amountMinor: 300 },
    ]);
    expect(created).toHaveLength(3);
    const total = await countExpenses(userId, { from: today, to: today });
    expect(total).toBe(3);
  });

  it("rolls back the entire batch if one row is invalid", async () => {
    const otherUser = await createTestUser();
    const otherCategory = await createCategory(otherUser.id, "Not yours");
    if (!otherCategory.ok) throw new Error("setup failed");
    const today = todayIso();

    await expect(
      createManyExpenses(userId, [
        { spentOn: today, categoryId, merchant: "Valid", amountMinor: 100 },
        {
          spentOn: today,
          categoryId: otherCategory.category.id,
          merchant: "Invalid",
          amountMinor: 200,
        },
      ]),
    ).rejects.toThrow();

    const total = await countExpenses(userId, { from: today, to: today });
    expect(total).toBe(0);
    await deleteTestUser(otherUser.id);
  });
});
