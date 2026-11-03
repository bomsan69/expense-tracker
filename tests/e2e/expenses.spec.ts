import { expect, test } from "@playwright/test";
import { login, settle } from "./helpers";

test.describe("expenses", () => {
  test("create via Add Expense, appears on Home with total updated, then edit and delete", async ({
    page,
  }) => {
    await login(page);

    const totalBefore = await page.getByTestId("spending-total").textContent();

    await page.goto("/expenses/new");
    await page.getByLabel(/^Category/).click();
    await page.getByRole("option").first().click();
    await page.getByLabel(/^Merchant/).fill("E2E Create Store");
    await page.getByLabel(/^Amount/).fill("12.34");
    await page.getByRole("button", { name: "Save Expense" }).click();
    await page.waitForURL("/");

    await expect(page.getByText("E2E Create Store")).toBeVisible();
    await expect(page.getByTestId("spending-total")).not.toHaveText(
      totalBefore ?? "",
    );

    await page.getByRole("link", { name: "E2E Create Store" }).click();
    await expect(page).toHaveURL(/\/expenses\/\d+/);
    await settle(page);

    await page.getByLabel(/^Merchant/).fill("E2E Updated Store");
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.waitForURL("/");
    await expect(page.getByText("E2E Updated Store")).toBeVisible();
    const totalAfterEdit = await page.getByTestId("spending-total").textContent();

    await page.getByRole("link", { name: "E2E Updated Store" }).click();
    await settle(page);
    await page.getByRole("button", { name: "Delete Expense" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Expense" })
      .click();
    await page.waitForURL("/");

    await expect(page.getByText("E2E Updated Store")).not.toBeVisible();
    await expect(page.getByTestId("spending-total")).toHaveText(
      totalBefore ?? "",
    );
    expect(totalAfterEdit).not.toBe(totalBefore);
  });

  test("a direct URL for a non-existent id shows not found", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/expenses/999999999");
    await expect(page.getByText("Expense not found")).toBeVisible();
    await page.getByRole("link", { name: "Back to Home" }).click();
    await expect(page).toHaveURL("/");
  });
});
