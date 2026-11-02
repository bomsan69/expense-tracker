import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSessionToken } from "@/lib/auth/session";
import { createCategory, getCategoryById } from "@/lib/queries/categories";
import { createTestUser, deleteTestUser } from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";

const cookieJar = createMockCookieJar();
const mockRedirect = createMockRedirect();

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { createCategoryAction, renameCategoryAction } = await import(
  "./actions"
);

let userId: number;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
  const token = await signSessionToken({ userId, tokenVersion: 0 });
  cookieJar.jar.set("session", token);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("createCategoryAction", () => {
  it("creates a category", async () => {
    const result = await createCategoryAction(
      undefined,
      formData({ name: "Food" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.name).toBe("Food");
  });

  it("rejects a blank name", async () => {
    const result = await createCategoryAction(
      undefined,
      formData({ name: "   " }),
    );
    expect(result).toEqual({ ok: false, error: "Enter a category name." });
  });

  it("rejects a case-insensitive duplicate", async () => {
    await createCategoryAction(undefined, formData({ name: "Food" }));
    const result = await createCategoryAction(
      undefined,
      formData({ name: "food" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "A category with this name already exists.",
    });
  });
});

describe("renameCategoryAction", () => {
  it("preserves the id while renaming", async () => {
    const created = await createCategory(userId, "Food");
    if (!created.ok) throw new Error("setup failed");
    const result = await renameCategoryAction(
      created.category.id,
      undefined,
      formData({ name: "Groceries" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(created.category.id);
      expect(result.data.name).toBe("Groceries");
    }
  });

  it("rejects renaming a category that belongs to another user", async () => {
    const otherUser = await createTestUser();
    const otherCategory = await createCategory(otherUser.id, "Not yours");
    if (!otherCategory.ok) throw new Error("setup failed");

    const result = await renameCategoryAction(
      otherCategory.category.id,
      undefined,
      formData({ name: "Hijacked" }),
    );
    expect(result).toEqual({
      ok: false,
      error: "This category could not be found.",
    });

    const stillOriginal = await getCategoryById(
      otherUser.id,
      otherCategory.category.id,
    );
    expect(stillOriginal?.name).toBe("Not yours");
    await deleteTestUser(otherUser.id);
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      createCategoryAction(undefined, formData({ name: "Food" })),
    ).rejects.toThrow("/login");
  });
});
