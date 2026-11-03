import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCategory } from "./categories";
import { createExpense } from "./expenses";
import {
  categoryBreakdownLastMonth,
  monthlyTotals,
  previousCalendarMonthLabel,
} from "./stats";
import { createTestUser, deleteTestUser } from "./test-helpers";

function monthStartIso(monthsAgo: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

let userId: number;
let foodId: number;
let travelId: number;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
  const food = await createCategory(userId, "Food");
  const travel = await createCategory(userId, "Travel");
  if (!food.ok || !travel.ok) throw new Error("setup failed");
  foodId = food.category.id;
  travelId = travel.category.id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("monthlyTotals", () => {
  it("returns 6 buckets: current month plus the previous 5, summed from real rows", async () => {
    // Current month: 1000 + 2000 = 3000.
    await createExpense(userId, {
      spentOn: monthStartIso(0),
      categoryId: foodId,
      merchant: "A",
      amountMinor: 1000,
    });
    await createExpense(userId, {
      spentOn: monthStartIso(0),
      categoryId: foodId,
      merchant: "B",
      amountMinor: 2000,
    });
    // 3 months ago: 500.
    await createExpense(userId, {
      spentOn: monthStartIso(3),
      categoryId: foodId,
      merchant: "C",
      amountMinor: 500,
    });
    // 7 months ago: out of the 6-bucket window, must not appear anywhere.
    await createExpense(userId, {
      spentOn: monthStartIso(7),
      categoryId: foodId,
      merchant: "D",
      amountMinor: 999_999,
    });

    const totals = await monthlyTotals(userId);
    expect(totals).toHaveLength(6);
    expect(totals[5]?.totalMinor).toBe(3000); // current month, last bucket
    expect(totals[2]?.totalMinor).toBe(500); // 3 months ago
    const grandTotal = totals.reduce((acc, t) => acc + t.totalMinor, 0);
    expect(grandTotal).toBe(3500);
  });

  it("returns 0 for every bucket when there are no expenses", async () => {
    const totals = await monthlyTotals(userId);
    expect(totals.every((t) => t.totalMinor === 0)).toBe(true);
  });
});

describe("categoryBreakdownLastMonth", () => {
  it("reconciles percentages to exactly 100 against hand-computed sums", async () => {
    // Previous full calendar month: Food 3000, Travel 7000 -> 30% / 70%.
    await createExpense(userId, {
      spentOn: monthStartIso(1),
      categoryId: foodId,
      merchant: "Groceries",
      amountMinor: 3000,
    });
    await createExpense(userId, {
      spentOn: monthStartIso(1),
      categoryId: travelId,
      merchant: "Flight",
      amountMinor: 7000,
    });
    // Current month: must be excluded from "last month".
    await createExpense(userId, {
      spentOn: monthStartIso(0),
      categoryId: foodId,
      merchant: "This month",
      amountMinor: 999_999,
    });

    const breakdown = await categoryBreakdownLastMonth(userId);
    expect(breakdown).toHaveLength(2);

    const food = breakdown.find((b) => b.categoryId === foodId);
    const travel = breakdown.find((b) => b.categoryId === travelId);
    expect(food?.totalMinor).toBe(3000);
    expect(food?.percentage).toBe(30);
    expect(travel?.totalMinor).toBe(7000);
    expect(travel?.percentage).toBe(70);

    const percentageSum = breakdown.reduce((acc, b) => acc + b.percentage, 0);
    expect(percentageSum).toBe(100);
  });

  it("returns an empty array when there are no expenses last month", async () => {
    expect(await categoryBreakdownLastMonth(userId)).toEqual([]);
  });
});

describe("previousCalendarMonthLabel", () => {
  it("formats the previous calendar month as 'Month YYYY'", () => {
    const now = new Date();
    const expectedDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
    );
    const expected = new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(expectedDate);
    expect(previousCalendarMonthLabel()).toBe(expected);
  });
});
