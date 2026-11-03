import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

function seriousOrCritical(results: { violations: { impact?: string | null }[] }) {
  return results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
}

const SCREENS: { name: string; path: string; requiresAuth: boolean }[] = [
  { name: "SCR-01 Login", path: "/login", requiresAuth: false },
  { name: "SCR-02 Home", path: "/", requiresAuth: true },
  { name: "SCR-04 Add Expense", path: "/expenses/new", requiresAuth: true },
  { name: "SCR-05 Settings", path: "/settings", requiresAuth: true },
  { name: "SCR-06 Statistics", path: "/stats", requiresAuth: true },
  {
    name: "SUP-02 Manage Categories",
    path: "/settings/categories",
    requiresAuth: true,
  },
  {
    name: "SUP-03 Change Password",
    path: "/settings/password",
    requiresAuth: true,
  },
];

test.describe("accessibility", () => {
  for (const screen of SCREENS) {
    test(`${screen.name} has zero serious or critical violations`, async ({
      page,
    }) => {
      if (screen.requiresAuth) {
        await login(page);
      }
      await page.goto(screen.path);
      const results = await new AxeBuilder({ page }).analyze();
      const violations = seriousOrCritical(results);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
  }

  test("SCR-03 Expense Detail has zero serious or critical violations", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/expenses/new");
    await page.getByLabel(/^Category/).click();
    await page.getByRole("option").first().click();
    await page.getByLabel(/^Merchant/).fill("A11y Detail Fixture");
    await page.getByLabel(/^Amount/).fill("1.00");
    await page.getByRole("button", { name: "Save Expense" }).click();
    await page.waitForURL("/");
    await page.getByRole("link", { name: "A11y Detail Fixture" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);

    await page.getByRole("button", { name: "Delete Expense" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Expense" })
      .click();
    await page.waitForURL("/");
  });

  test("SUP-01 Receipt Review has zero serious or critical violations", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/expenses/new");
    await page.evaluate(() => {
      sessionStorage.setItem(
        "receipt_draft",
        JSON.stringify({
          filename: "a11y.jpg",
          items: [
            {
              spentOn: "2026-10-31",
              categoryId: null,
              merchant: "A11y Item",
              amountMinor: 100,
              isDuplicate: false,
            },
          ],
        }),
      );
    });
    await page.goto("/receipt/review");

    const results = await new AxeBuilder({ page }).analyze();
    const violations = seriousOrCritical(results);
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
