import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSessionToken } from "@/lib/auth/session";
import { addDays, todayIso } from "@/lib/dates";
import { createCategory } from "@/lib/queries/categories";
import { createExpense } from "@/lib/queries/expenses";
import { createTestUser, deleteTestUser } from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";

const cookieJar = createMockCookieJar();
const mockRedirect = vi.fn(createMockRedirect());

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { getHomeData } = await import("./actions");

let userId: number;
let foodId: number;
let travelId: number;

beforeEach(async () => {
  mockRedirect.mockClear();
  const user = await createTestUser();
  userId = user.id;
  const food = await createCategory(userId, "Food");
  const travel = await createCategory(userId, "Travel");
  if (!food.ok || !travel.ok) throw new Error("setup failed");
  foodId = food.category.id;
  travelId = travel.category.id;
  const token = await signSessionToken({ userId, tokenVersion: 0 });
  cookieJar.jar.set("session", token);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("getHomeData", () => {
  it("defaults to today - 7 through today, inclusive", async () => {
    const result = await getHomeData({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.to).toBe(todayIso());
      expect(result.data.from).toBe(addDays(todayIso(), -7));
    }
  });

  it("rejects From > To before running any query", async () => {
    const result = await getHomeData({
      from: todayIso(),
      to: addDays(todayIso(), -1),
    });
    expect(result).toEqual({
      ok: false,
      error: "The start date must be on or before the end date.",
    });
  });

  it("filters by category and computes the matching total", async () => {
    const today = todayIso();
    await createExpense(userId, {
      spentOn: today,
      categoryId: foodId,
      merchant: "Groceries",
      amountMinor: 1000,
    });
    await createExpense(userId, {
      spentOn: today,
      categoryId: travelId,
      merchant: "Flight",
      amountMinor: 5000,
    });

    const result = await getHomeData({
      from: today,
      to: today,
      category: String(foodId),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]?.merchant).toBe("Groceries");
      expect(result.data.totalMinor).toBe(1000);
    }
  });

  it("falls back to All for a foreign or stale category id", async () => {
    const today = todayIso();
    await createExpense(userId, {
      spentOn: today,
      categoryId: foodId,
      merchant: "Groceries",
      amountMinor: 1000,
    });
    const result = await getHomeData({
      from: today,
      to: today,
      category: "999999",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.categoryId).toBeNull();
      expect(result.data.items).toHaveLength(1);
    }
  });

  it("returns $0.00-equivalent (0) total and an empty list for no matches", async () => {
    const today = todayIso();
    const result = await getHomeData({ from: today, to: today });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toEqual([]);
      expect(result.data.totalMinor).toBe(0);
    }
  });

  it("clamps an out-of-range page to the last valid page", async () => {
    const today = todayIso();
    for (let i = 0; i < 5; i++) {
      await createExpense(userId, {
        spentOn: today,
        categoryId: foodId,
        merchant: `M${i}`,
        amountMinor: 100,
      });
    }
    const result = await getHomeData({
      from: today,
      to: today,
      page: "999",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.page).toBe(1); // only 1 page for 5 rows at 10/page
      expect(result.data.totalPages).toBe(1);
      expect(result.data.items).toHaveLength(5);
    }
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(getHomeData({})).rejects.toThrow("/login");
  });
});
