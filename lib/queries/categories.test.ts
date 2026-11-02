import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createCategory,
  getCategoryById,
  listCategories,
  renameCategory,
} from "./categories";
import { createTestUser, deleteTestUser } from "./test-helpers";

let userId: number;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("createCategory", () => {
  it("creates a category for the user", async () => {
    const result = await createCategory(userId, "Food");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.category.name).toBe("Food");
      expect(result.category.nameNormalized).toBe("food");
      expect(result.category.userId).toBe(userId);
    }
  });

  it("rejects a case-insensitive duplicate", async () => {
    await createCategory(userId, "Food");
    const result = await createCategory(userId, "food");
    expect(result).toEqual({ ok: false, error: "duplicate" });
  });
});

describe("listCategories", () => {
  it("returns categories ascending by label, case-insensitive", async () => {
    await createCategory(userId, "Travel");
    await createCategory(userId, "banana");
    await createCategory(userId, "Apple");
    const list = await listCategories(userId);
    expect(list.map((c) => c.name)).toEqual(["Apple", "banana", "Travel"]);
  });
});

describe("renameCategory", () => {
  it("preserves the category id and updates the name", async () => {
    const created = await createCategory(userId, "Food");
    if (!created.ok) throw new Error("setup failed");
    const renamed = await renameCategory(userId, created.category.id, "Groceries");
    expect(renamed).toEqual({
      ok: true,
      category: expect.objectContaining({
        id: created.category.id,
        name: "Groceries",
        nameNormalized: "groceries",
      }),
    });
  });

  it("rejects renaming to a name that collides with another category", async () => {
    const first = await createCategory(userId, "Food");
    const second = await createCategory(userId, "Travel");
    if (!first.ok || !second.ok) throw new Error("setup failed");
    const result = await renameCategory(userId, second.category.id, "food");
    expect(result).toEqual({ ok: false, error: "duplicate" });
  });

  it("returns not_found for a nonexistent category", async () => {
    const result = await renameCategory(userId, 9_999_999, "Anything");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("getCategoryById", () => {
  it("returns null for a nonexistent id", async () => {
    expect(await getCategoryById(userId, 9_999_999)).toBeNull();
  });
});
