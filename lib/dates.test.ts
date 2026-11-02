import { describe, expect, it } from "vitest";
import { addDays, defaultDateRange, formatDate, todayIso } from "./dates";

describe("formatDate", () => {
  it("formats an ISO date as a localized string", () => {
    expect(formatDate("2026-10-31")).toBe("Oct 31, 2026");
  });
});

describe("addDays", () => {
  it("adds days within a month", () => {
    expect(addDays("2026-10-20", 5)).toBe("2026-10-25");
  });

  it("subtracts days across a month boundary", () => {
    expect(addDays("2026-11-02", -7)).toBe("2026-10-26");
  });

  it("carries across a year boundary", () => {
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });
});

describe("todayIso", () => {
  it("returns today's date in YYYY-MM-DD format", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayIso()).toBe(expected);
  });
});

describe("defaultDateRange", () => {
  it("returns today minus 7 days through today, inclusive", () => {
    const { from, to } = defaultDateRange();
    expect(to).toBe(todayIso());
    expect(from).toBe(addDays(to, -7));
  });
});
