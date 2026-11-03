import type { Page } from "@playwright/test";

export const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "";
export const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "";

export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/^Email/).fill(SEED_EMAIL);
  await page.getByLabel(/^Password/).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}

// Playwright's URL-based waits resolve as soon as Next's client router
// updates the URL (optimistic navigation), which can be before the new
// page's client components finish hydrating — a click right after can land
// before React has attached its handlers. `networkidle` reliably settles
// past that window without coupling to any specific DOM marker.
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}
