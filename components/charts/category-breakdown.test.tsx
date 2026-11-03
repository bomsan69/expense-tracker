import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryBreakdownChart } from "./category-breakdown";

const data = [
  { categoryId: 1, categoryName: "Food", totalMinor: 3000, percentage: 30 },
  { categoryId: 2, categoryName: "Travel", totalMinor: 7000, percentage: 70 },
];

describe("CategoryBreakdownChart", () => {
  it("shows an informative empty-chart message with no data", () => {
    render(<CategoryBreakdownChart data={[]} monthLabel="October 2026" />);
    expect(
      screen.getByText("No expenses recorded for October 2026."),
    ).toBeInTheDocument();
  });

  it("shows a legend and an accessible table with matching percentages", () => {
    render(<CategoryBreakdownChart data={data} monthLabel="October 2026" />);
    expect(screen.getByText("Food 30%")).toBeInTheDocument();
    expect(screen.getByText("Travel 70%")).toBeInTheDocument();
    expect(
      screen.getByText("Category breakdown for October 2026"),
    ).toBeInTheDocument();
  });
});
