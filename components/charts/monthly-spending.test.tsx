import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySpendingChart } from "./monthly-spending";

const months = [
  { year: 2026, month: 6, label: "Jun", totalMinor: 1000 },
  { year: 2026, month: 7, label: "Jul", totalMinor: 2000 },
  { year: 2026, month: 8, label: "Aug", totalMinor: 1500 },
  { year: 2026, month: 9, label: "Sep", totalMinor: 3000 },
  { year: 2026, month: 10, label: "Oct", totalMinor: 4000 },
  { year: 2026, month: 11, label: "Nov", totalMinor: 500 },
];

describe("MonthlySpendingChart", () => {
  it("shows an informative empty-chart message with no spending", () => {
    const zeroMonths = months.map((m) => ({ ...m, totalMinor: 0 }));
    render(<MonthlySpendingChart data={zeroMonths} />);
    expect(
      screen.getByText("No spending recorded in the last 6 months."),
    ).toBeInTheDocument();
  });

  it("provides an accessible table with the same figures as the chart", () => {
    render(<MonthlySpendingChart data={months} />);
    expect(
      screen.getByText("Monthly spending, the last 6 calendar months"),
    ).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument(); // Oct bucket
    expect(screen.getByText("$5.00")).toBeInTheDocument(); // Nov bucket
  });
});
