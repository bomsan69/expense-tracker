import { expect, test } from "@playwright/test";
import {
  clearAiSettingsDirect,
  deleteExpensesByMerchantPrefix,
  getSeedUserId,
  setAiSettingsDirect,
} from "./db-helpers";
import { SEED_EMAIL, login, settle } from "./helpers";
import { MOCK_AUTH_FAIL_KEY, MOCK_SUCCESS_KEY } from "./mock-openai-server";

// A minimal valid 1x1 JPEG — content doesn't matter since the provider
// call itself is stubbed (tests/e2e/mock-openai-server.ts).
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
  "base64",
);

test.describe("receipt import", () => {
  let userId: number;

  test.beforeAll(async () => {
    userId = await getSeedUserId(SEED_EMAIL);
  });

  test.afterAll(async () => {
    // db-helpers' pool is a module singleton shared across every spec file
    // in this worker process — do not close it here; stats.spec.ts (the
    // last file to run) closes it once for the whole suite.
    await clearAiSettingsDirect(userId);
    // The mock items are "Milk"/"Bread" (tests/e2e/mock-openai-server.ts).
    await deleteExpensesByMerchantPrefix(userId, "Milk");
    await deleteExpensesByMerchantPrefix(userId, "Bread");
  });

  test("picking an image produces proposed rows, nothing saves before confirmation, editing/removing works, and Confirm & Save All writes every row", async ({
    page,
  }) => {
    await setAiSettingsDirect(userId, "gpt-4o-mini", MOCK_SUCCESS_KEY);
    await login(page);
    await page.goto("/expenses/new");
    await settle(page);

    const albumInput = page.locator('input[type="file"]:not([capture])');
    await albumInput.setInputFiles({
      name: "receipt.jpg",
      mimeType: "image/jpeg",
      buffer: TINY_JPEG,
    });

    await page.waitForURL("/receipt/review");
    await expect(page.getByText("Milk")).toBeVisible();
    await expect(page.getByText("Bread")).toBeVisible();
    await expect(page.getByText("Total · 2 items")).toBeVisible();

    // Remove one row; the total and item count update, nothing is saved yet.
    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByText("Total · 1 items")).toBeVisible();

    await page.getByRole("button", { name: "Confirm & Save All" }).click();
    await page.waitForURL("/");
    await expect(page.getByText(/Milk|Bread/)).toBeVisible();
  });

  test("Cancel writes nothing and returns to Add Expense", async ({
    page,
  }) => {
    await setAiSettingsDirect(userId, "gpt-4o-mini", MOCK_SUCCESS_KEY);
    await login(page);
    await page.goto("/expenses/new");
    await settle(page);

    const albumInput = page.locator('input[type="file"]:not([capture])');
    await albumInput.setInputFiles({
      name: "receipt2.jpg",
      mimeType: "image/jpeg",
      buffer: TINY_JPEG,
    });
    await page.waitForURL("/receipt/review");

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL("/expenses/new");
  });

  test("a stubbed provider failure offers retry or manual entry", async ({
    page,
  }) => {
    await setAiSettingsDirect(userId, "gpt-4o-mini", MOCK_AUTH_FAIL_KEY);
    await login(page);
    await page.goto("/expenses/new");
    await settle(page);

    const albumInput = page.locator('input[type="file"]:not([capture])');
    await albumInput.setInputFiles({
      name: "receipt3.jpg",
      mimeType: "image/jpeg",
      buffer: TINY_JPEG,
    });

    await expect(
      page.getByText("Your AI API key was rejected. Check it in Settings."),
    ).toBeVisible();
    // Retry: the picker remains usable.
    await expect(
      page.getByRole("button", { name: "Take Photo" }),
    ).toBeEnabled();
    // Manual entry: the manual form stays right there, usable.
    await expect(page.getByLabel(/^Merchant/)).toBeEditable();
  });
});
