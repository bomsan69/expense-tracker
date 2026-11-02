import { describe, expect, it } from "vitest";
import {
  amountSchema,
  categoryIdSchema,
  dateRangeSchema,
  expenseInputSchema,
  merchantSchema,
  notesSchema,
  pageSchema,
  spentOnSchema,
} from "./expense";

describe("spentOnSchema", () => {
  it("accepts a valid ISO date", () => {
    expect(spentOnSchema.safeParse("2026-10-31").success).toBe(true);
  });

  it("rejects an invalid calendar date", () => {
    const result = spentOnSchema.safeParse("2026-02-30");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter a valid date.");
    }
  });
});

describe("categoryIdSchema", () => {
  it("transforms a numeric string into a number", () => {
    expect(categoryIdSchema.safeParse("4")).toEqual(
      expect.objectContaining({ success: true, data: 4 }),
    );
  });

  it("rejects a blank value", () => {
    const result = categoryIdSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Select a category.");
    }
  });
});

describe("merchantSchema", () => {
  it("rejects an empty merchant", () => {
    const result = merchantSchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter a merchant name.");
    }
  });

  it("rejects a merchant over 160 characters", () => {
    const result = merchantSchema.safeParse("a".repeat(161));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter a merchant name.");
    }
  });
});

describe("amountSchema", () => {
  it("parses a valid amount into minor units", () => {
    expect(amountSchema.safeParse("85.30")).toEqual(
      expect.objectContaining({ success: true, data: 8530 }),
    );
  });

  it("rejects zero", () => {
    const result = amountSchema.safeParse("0");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Enter an amount greater than 0.",
      );
    }
  });

  it("rejects more than two decimal places", () => {
    expect(amountSchema.safeParse("85.303").success).toBe(false);
  });
});

describe("notesSchema", () => {
  it("rejects notes over 500 characters", () => {
    const result = notesSchema.safeParse("a".repeat(501));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Notes must be 500 characters or fewer.",
      );
    }
  });

  it("allows notes to be omitted", () => {
    expect(notesSchema.safeParse(undefined).success).toBe(true);
  });
});

describe("expenseInputSchema", () => {
  it("accepts a fully valid expense", () => {
    const result = expenseInputSchema.safeParse({
      spentOn: "2026-10-31",
      categoryId: "2",
      merchant: "Trader Joe's",
      amountMinor: "42.10",
      notes: "weekly groceries",
    });
    expect(result.success).toBe(true);
  });
});

describe("dateRangeSchema", () => {
  it("accepts from <= to", () => {
    expect(
      dateRangeSchema.safeParse({ from: "2026-10-01", to: "2026-10-31" })
        .success,
    ).toBe(true);
  });

  it("rejects from > to", () => {
    const result = dateRangeSchema.safeParse({
      from: "2026-11-01",
      to: "2026-10-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "The start date must be on or before the end date.",
      );
    }
  });
});

describe("pageSchema", () => {
  it("defaults an invalid page to 1", () => {
    expect(pageSchema.parse("not-a-number")).toBe(1);
  });

  it("defaults a non-positive page to 1", () => {
    expect(pageSchema.parse("0")).toBe(1);
  });

  it("parses a valid page", () => {
    expect(pageSchema.parse("3")).toBe(3);
  });
});
