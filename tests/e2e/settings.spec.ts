import { expect, test } from "@playwright/test";
import { login } from "./helpers";
import { MOCK_AUTH_FAIL_KEY, MOCK_SUCCESS_KEY } from "./mock-openai-server";

const RAW_KEY = "sk-e2e-real-secret-key-998877";

test.describe("settings", () => {
  test("saving the AI config persists the model, shows the key masked only, and never leaks the raw key", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings");
    await page.getByLabel(/^AI Model/).fill("gpt-4o-mini");
    await page.getByLabel(/^API Key/).fill(RAW_KEY);

    const responseBodies: string[] = [];
    page.on("response", (response) => {
      void response
        .text()
        .then((text) => responseBodies.push(text))
        .catch(() => {});
    });

    await page.getByRole("button", { name: "Save Settings" }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();

    const html = await page.content();
    expect(html).not.toContain(RAW_KEY);
    for (const body of responseBodies) {
      expect(body).not.toContain(RAW_KEY);
    }

    await page.reload();
    const keyInput = page.getByLabel(/^API Key/);
    await expect(keyInput).toHaveAttribute("placeholder", /••••••••\d{4}/);
    await expect(keyInput).toHaveValue("");
  });

  test("Verify checks the typed model and key against the provider without saving", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings");
    // Whatever key (if any) an earlier test in this shared-fixture file already
    // stored — Verify must leave it exactly as-is either way.
    const placeholderBefore = await page
      .getByLabel(/^API Key/)
      .getAttribute("placeholder");

    await page.getByLabel(/^AI Model/).fill("gpt-4o-mini");
    await page.getByLabel(/^API Key/).fill(MOCK_SUCCESS_KEY);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("Connection verified.")).toBeVisible();

    await page.getByLabel(/^API Key/).fill(MOCK_AUTH_FAIL_KEY);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(
      page.getByText("Your AI API key was rejected. Check it in Settings."),
    ).toBeVisible();

    // Verify never persists: reloading shows the same stored key as before.
    await page.reload();
    await expect(page.getByLabel(/^API Key/)).toHaveAttribute(
      "placeholder",
      placeholderBefore ?? "Enter API key",
    );
  });

  test("adding a category makes it selectable on Add Expense", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings/categories");
    const uniqueName = `E2E Category ${Date.now()}`;
    await page.getByLabel(/^New Category Name/).fill(uniqueName);
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(page.getByText(uniqueName)).toBeVisible();

    await page.goto("/expenses/new");
    await page.getByLabel(/^Category/).click();
    await expect(
      page.getByRole("option", { name: uniqueName }),
    ).toBeVisible();
  });

  test("renaming a category updates existing expenses' displayed label while ids are unchanged", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings/categories");
    const originalName = `E2E Rename ${Date.now()}`;
    await page.getByLabel(/^New Category Name/).fill(originalName);
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(page.getByText(originalName)).toBeVisible();

    await page.goto("/expenses/new");
    await page.getByLabel(/^Category/).click();
    await page.getByRole("option", { name: originalName }).click();
    await page.getByLabel(/^Merchant/).fill("E2E Rename Expense");
    await page.getByLabel(/^Amount/).fill("5.00");
    await page.getByRole("button", { name: "Save Expense" }).click();
    await page.waitForURL("/");
    await expect(page.getByText(originalName)).toBeVisible();

    await page.goto("/settings/categories");
    const row = page.locator("li", { hasText: originalName });
    await row.getByRole("button", { name: "Edit" }).click();
    const renamedName = `${originalName} Renamed`;
    // Editing swaps the row's display text for an input, so it no longer
    // matches the `hasText` filter above — re-scope by the edit form's
    // (sr-only) label instead of the row's now-stale text content.
    const editingRow = page
      .getByRole("listitem")
      .filter({ has: page.getByLabel("Category name") });
    await editingRow.getByRole("textbox").fill(renamedName);
    await editingRow.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(renamedName)).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(renamedName)).toBeVisible();

    await page.getByRole("link", { name: "E2E Rename Expense" }).click();
    await page.getByRole("button", { name: "Delete Expense" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Expense" })
      .click();
    await page.waitForURL("/");
  });

  test("blank and duplicate category names are rejected", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/settings/categories");

    // Whitespace passes the native `required` check but is blank after
    // trimming, exercising the server's own validation message.
    await page.getByLabel(/^New Category Name/).fill("   ");
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(page.getByText("Enter a category name.")).toBeVisible();

    await page.getByLabel(/^New Category Name/).fill("food");
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(
      page.getByText("A category with this name already exists."),
    ).toBeVisible();
  });
});
