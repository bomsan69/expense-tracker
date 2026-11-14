import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySpendingChart } from "./monthly-spending";

const months = [
  { year: 2026, month: 6, label: "Jun", husbandMinor: 600, wifeMinor: 400, totalMinor: 1000 },
  { year: 2026, month: 7, label: "Jul", husbandMinor: 2000, wifeMinor: 0, totalMinor: 2000 },
  { year: 2026, month: 8, label: "Aug", husbandMinor: 500, wifeMinor: 1000, totalMinor: 1500 },
  { year: 2026, month: 9, label: "Sep", husbandMinor: 1000, wifeMinor: 2000, totalMinor: 3000 },
  { year: 2026, month: 10, label: "Oct", husbandMinor: 2500, wifeMinor: 1500, totalMinor: 4000 },
  { year: 2026, month: 11, label: "Nov", husbandMinor: 0, wifeMinor: 500, totalMinor: 500 },
];

describe("MonthlySpendingChart", () => {
  it("shows an informative empty-chart message with no spending", () => {
    const zeroMonths = months.map((m) => ({
      ...m,
      husbandMinor: 0,
      wifeMinor: 0,
      totalMinor: 0,
    }));
    render(<MonthlySpendingChart data={zeroMonths} />);
    expect(
      screen.getByText("No spending recorded in the last 6 months."),
    ).toBeInTheDocument();
  });

  it("provides an accessible table with the same figures as the chart", () => {
    render(<MonthlySpendingChart data={months} />);
    expect(
      screen.getByText("Monthly spending by person, the last 6 calendar months"),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^Oct/ })).toHaveTextContent(
      "$40.00",
    );
    expect(screen.getByRole("row", { name: /^Nov/ })).toHaveTextContent(
      "$5.00",
    );
  });

  it("breaks each month down by person in the accessible table (D11)", () => {
    render(<MonthlySpendingChart data={months} />);
    const columns = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(columns).toEqual(["Month", "Husband", "Wife", "Total"]);

    // Oct: husband $25.00 + wife $15.00 = $40.00, as hand-computed above.
    const octRow = screen.getByRole("row", { name: /^Oct/ });
    expect(octRow).toHaveTextContent("$25.00");
    expect(octRow).toHaveTextContent("$15.00");
    expect(octRow).toHaveTextContent("$40.00");
  });

  it("names both people in a visible legend, so colour is not the only cue", () => {
    render(<MonthlySpendingChart data={months} />);
    const legend = screen.getByTestId("person-legend");
    expect(legend).toHaveTextContent("Husband");
    expect(legend).toHaveTextContent("Wife");
  });
});
