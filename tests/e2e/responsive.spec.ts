import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const WIDTHS = [320, 390, 430];
const SCREENS = ["/", "/expenses/new", "/stats", "/settings"];

test.describe("responsive", () => {
  for (const width of WIDTHS) {
    for (const path of SCREENS) {
      test(`${path} has no horizontal overflow at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 844 });
        await login(page);
        await page.goto(path);
        const hasOverflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        );
        expect(hasOverflow).toBe(false);
      });
    }
  }

  test("the bottom nav is visible and does not overlap the primary CTA at 320px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await login(page);
    await page.goto("/expenses/new");

    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    const navBox = await nav.boundingBox();
    const ctaBox = await page
      .getByRole("button", { name: "Save Expense" })
      .boundingBox();

    expect(navBox).not.toBeNull();
    expect(ctaBox).not.toBeNull();
    if (navBox && ctaBox) {
      expect(ctaBox.y + ctaBox.height).toBeLessThanOrEqual(navBox.y);
    }
  });
});
