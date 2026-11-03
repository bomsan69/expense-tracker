import { expect, test } from "@playwright/test";
import { addDays, todayIso } from "../../lib/dates";
import {
  createExpensesDirect,
  deleteExpensesByMerchantPrefix,
  getFirstCategoryId,
  getSeedUserId,
} from "./db-helpers";
import { SEED_EMAIL, login } from "./helpers";

const ISOLATED_DATE = "2020-06-15";
const MERCHANT_PREFIX = "E2EFilter-";

test.describe("filters", () => {
  let userId: number;
  let categoryId: number;

  test.beforeAll(async () => {
    userId = await getSeedUserId(SEED_EMAIL);
    categoryId = await getFirstCategoryId(userId);
    const rows = Array.from({ length: 11 }, (_, i) => ({
      spentOn: ISOLATED_DATE,
      merchant: `${MERCHANT_PREFIX}${String(i).padStart(2, "0")}`,
      amountMinor: 100 + i,
    }));
    await createExpensesDirect(userId, categoryId, rows);
  });

  test.afterAll(async () => {
    // db-helpers' pool is a module singleton shared across every spec file
    // in this worker process — do not close it here; stats.spec.ts (the
    // last file to run) closes it once for the whole suite.
    await deleteExpensesByMerchantPrefix(userId, MERCHANT_PREFIX);
  });

  test("defaults to today - 7 through today, inclusive", async ({ page }) => {
    await login(page);
    const from = await page.getByLabel(/^From/).inputValue();
    const to = await page.getByLabel(/^To/).inputValue();
    expect(to).toBe(todayIso());
    expect(from).toBe(addDays(todayIso(), -7));
  });

  test("From > To shows the validation message and fires no query", async ({
    page,
  }) => {
    await login(page);
    await page.goto(
      `/?from=${encodeURIComponent(todayIso())}&to=${encodeURIComponent(addDays(todayIso(), -1))}`,
    );
    await expect(
      page.getByText("The start date must be on or before the end date."),
    ).toBeVisible();
    await expect(page.getByText(/No expenses found/)).not.toBeVisible();
  });

  test("a filter matching nothing shows $0.00 and the empty state", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/?from=2019-01-01&to=2019-01-02&category=all");
    await expect(page.getByTestId("spending-total")).toHaveText("$0.00");
    await expect(page.getByText("No expenses found")).toBeVisible();
  });

  test("pagination holds at 10 per page with bounds respected, and list + total refresh together", async ({
    page,
  }) => {
    await login(page);
    await page.goto(
      `/?from=${ISOLATED_DATE}&to=${ISOLATED_DATE}&category=${categoryId}`,
    );

    // Sorted spent_on DESC, id DESC: with every row on the same date, the
    // most-recently-inserted (highest id, "-10") sorts first.
    await expect(page.getByText(`${MERCHANT_PREFIX}10`)).toBeVisible();
    const rowsPage1 = await page.locator("li", { hasText: MERCHANT_PREFIX }).count();
    expect(rowsPage1).toBe(10);
    const totalPage1 = await page.getByTestId("spending-total").textContent();

    // Out-of-range page clamps to the last valid page (2), not an empty page.
    await page.goto(
      `/?from=${ISOLATED_DATE}&to=${ISOLATED_DATE}&category=${categoryId}&page=99`,
    );
    const rowsClamped = await page.locator("li", { hasText: MERCHANT_PREFIX }).count();
    expect(rowsClamped).toBe(1);
    await expect(page.getByText(`${MERCHANT_PREFIX}00`)).toBeVisible();

    // Total is identical regardless of page (same filter condition, D row 182).
    await expect(page.getByTestId("spending-total")).toHaveText(totalPage1 ?? "");
  });

  test("changing a filter resets to page 1", async ({ page }) => {
    await login(page);
    await page.goto(
      `/?from=${ISOLATED_DATE}&to=${ISOLATED_DATE}&category=${categoryId}&page=2`,
    );
    await expect(page.locator("li", { hasText: MERCHANT_PREFIX })).toHaveCount(1);

    await page.getByLabel(/^Category/).click();
    await page.getByRole("option", { name: "All Categories" }).click();
    await page.waitForURL((url) => !url.search.includes("page=2"));

    const rowsAfter = await page.locator("li", { hasText: MERCHANT_PREFIX }).count();
    expect(rowsAfter).toBe(10); // back to page 1
  });
});
