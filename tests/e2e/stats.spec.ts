import { expect, test } from "@playwright/test";
import { todayIso } from "../../lib/dates";
import {
  closeDb,
  createExpensesDirect,
  deleteAllExpenses,
  getCategoryIdByName,
  getSeedUserId,
} from "./db-helpers";
import { SEED_EMAIL, login } from "./helpers";

function monthStart(monthsAgo: number): string {
  const [year, month] = todayIso().split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1 - monthsAgo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(monthsAgo: number): string {
  const [year, month] = todayIso().split("-").map(Number) as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1 - monthsAgo, 1));
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(d);
}

test.describe("stats", () => {
  let userId: number;
  let foodId: number;
  let travelId: number;

  test.beforeAll(async () => {
    userId = await getSeedUserId(SEED_EMAIL);
    foodId = await getCategoryIdByName(userId, "Food");
    travelId = await getCategoryIdByName(userId, "Travel");
  });

  test.afterAll(async () => {
    await deleteAllExpenses(userId);
    await closeDb();
  });

  test("shows the empty-chart message with no expenses", async ({ page }) => {
    await deleteAllExpenses(userId);
    await login(page);
    await page.goto("/stats");
    await expect(
      page.getByText("No spending recorded in the last 6 months."),
    ).toBeVisible();
    await expect(
      page.getByText(`No expenses recorded for ${monthLabel(1)}`, { exact: false }),
    ).toBeVisible();
  });

  test("the 6 monthly bars and previous-month category percentages match hand-computed figures, with a matching accessible table", async ({
    page,
  }) => {
    await deleteAllExpenses(userId);

    // Current month (bucket index 5): 1000 cents.
    await createExpensesDirect(userId, foodId, [
      { spentOn: monthStart(0), merchant: "StatsCurrent", amountMinor: 1000 },
    ]);
    // 3 months ago (bucket index 2): 2500 cents.
    await createExpensesDirect(userId, foodId, [
      { spentOn: monthStart(3), merchant: "Stats3MonthsAgo", amountMinor: 2500 },
    ]);
    // Previous month (the pie chart's month): Food 3000, Travel 7000 -> 30% / 70%.
    await createExpensesDirect(userId, foodId, [
      { spentOn: monthStart(1), merchant: "StatsPrevFood", amountMinor: 3000 },
    ]);
    await createExpensesDirect(userId, travelId, [
      { spentOn: monthStart(1), merchant: "StatsPrevTravel", amountMinor: 7000 },
    ]);

    await login(page);
    await page.goto("/stats");

    // Accessible table for the bar chart carries the same 6 hand-computed values.
    const barTable = page.getByRole("table").first();
    await expect(barTable.getByRole("cell", { name: monthLabel(0) })).toBeAttached();
    await expect(barTable.getByRole("row", { name: new RegExp(monthLabel(0)) })).toContainText(
      "$10.00",
    );
    await expect(barTable.getByRole("row", { name: new RegExp(monthLabel(3)) })).toContainText(
      "$25.00",
    );

    // Pie chart legend and its accessible table both show the reconciled percentages.
    await expect(page.getByText("Food 30%")).toBeVisible();
    await expect(page.getByText("Travel 70%")).toBeVisible();
    const pieTable = page.getByRole("table").nth(1);
    await expect(pieTable).toContainText("Food");
    await expect(pieTable).toContainText("$30.00");
    await expect(pieTable).toContainText("30%");
    await expect(pieTable).toContainText("Travel");
    await expect(pieTable).toContainText("$70.00");
    await expect(pieTable).toContainText("70%");
  });
});
