import { describe, expect, it } from "vitest";
import { categoryNameSchema } from "./category";

describe("categoryNameSchema", () => {
  it("accepts and trims a valid name", () => {
    expect(categoryNameSchema.parse("  Food  ")).toBe("Food");
  });

  it("rejects a blank name", () => {
    const result = categoryNameSchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Enter a category name.",
      );
    }
  });

  it("rejects a name over 64 characters", () => {
    expect(categoryNameSchema.safeParse("a".repeat(65)).success).toBe(false);
  });
});
