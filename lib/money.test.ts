import { describe, expect, it } from "vitest";
import { formatMoney, parseAmountToMinor } from "./money";

describe("formatMoney", () => {
  it("formats cents as a USD currency string", () => {
    expect(formatMoney(124850)).toBe("$1,248.50");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("pads a single-digit cents remainder", () => {
    expect(formatMoney(105)).toBe("$1.05");
  });
});

describe("parseAmountToMinor", () => {
  it("parses a two-decimal amount into cents", () => {
    expect(parseAmountToMinor("85.30")).toBe(8530);
  });

  it("parses a whole-dollar amount", () => {
    expect(parseAmountToMinor("85")).toBe(8500);
  });

  it("pads a single-decimal amount", () => {
    expect(parseAmountToMinor("85.3")).toBe(8530);
  });

  it("rejects more than two decimal places", () => {
    expect(() => parseAmountToMinor("85.303")).toThrow();
  });

  it("rejects non-numeric input", () => {
    expect(() => parseAmountToMinor("abc")).toThrow();
  });
});
