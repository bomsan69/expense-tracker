import { expect, test } from "@playwright/test";
import { SEED_EMAIL, SEED_PASSWORD, login } from "./helpers";

const TEMP_PASSWORD = "e2e.temp.password1";

test.describe("password", () => {
  test("wrong current password is rejected", async ({ page }) => {
    await login(page);
    await page.goto("/settings/password");
    await page.getByLabel(/^Current Password/).fill("not-the-real-password1");
    await page.getByLabel(/^New Password/).fill("new.password12345");
    await page.getByLabel(/^Confirm New Password/).fill("new.password12345");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(
      page.getByText("Your current password is incorrect."),
    ).toBeVisible();
  });

  test("a weak new password is rejected with the policy message", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings/password");
    await page.getByLabel(/^Current Password/).fill(SEED_PASSWORD);
    await page.getByLabel(/^New Password/).fill("short1");
    await page.getByLabel(/^Confirm New Password/).fill("short1");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(
      page.getByText("Use at least 10 characters with a letter and a number."),
    ).toBeVisible();
  });

  test("a mismatched confirmation is rejected", async ({ page }) => {
    await login(page);
    await page.goto("/settings/password");
    await page.getByLabel(/^Current Password/).fill(SEED_PASSWORD);
    await page.getByLabel(/^New Password/).fill("new.password12345");
    await page
      .getByLabel(/^Confirm New Password/)
      .fill("different.password1");
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText("The passwords do not match.")).toBeVisible();
  });

  test("a valid change succeeds and the new password logs in", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings/password");
    await page.getByLabel(/^Current Password/).fill(SEED_PASSWORD);
    await page.getByLabel(/^New Password/).fill(TEMP_PASSWORD);
    await page.getByLabel(/^Confirm New Password/).fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/Password updated/)).toBeVisible();
    await page.waitForURL("/settings");

    await page.getByRole("button", { name: "Log Out" }).click();
    await expect(page).toHaveURL("/login");
    await page.getByLabel(/^Email/).fill(SEED_EMAIL);
    await page.getByLabel(/^Password/).fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/");

    // Restore the original password so later specs can still log in.
    await page.goto("/settings/password");
    await page.getByLabel(/^Current Password/).fill(TEMP_PASSWORD);
    await page.getByLabel(/^New Password/).fill(SEED_PASSWORD);
    await page.getByLabel(/^Confirm New Password/).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText(/Password updated/)).toBeVisible();
  });
});
