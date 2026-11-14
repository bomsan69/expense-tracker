import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpendingSummary } from "./spending-summary";

const totals = { husbandMinor: 100000, wifeMinor: 24850 };

describe("SpendingSummary", () => {
  it("formats the total and date range", () => {
    render(
      <SpendingSummary
        totalMinor={124850}
        personTotals={totals}
        from="2026-10-25"
        to="2026-11-01"
      />,
    );
    expect(screen.getByText("$1,248.50")).toBeInTheDocument();
    expect(screen.getByText(/Oct 25, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Nov 1, 2026/)).toBeInTheDocument();
  });

  it("shows $0.00 for an empty result (STATE-02)", () => {
    render(
      <SpendingSummary
        totalMinor={0}
        personTotals={{ husbandMinor: 0, wifeMinor: 0 }}
        from="2026-10-25"
        to="2026-11-01"
      />,
    );
    expect(screen.getByTestId("spending-total")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("total-husband")).toHaveTextContent("$0.00");
    expect(screen.getByTestId("total-wife")).toHaveTextContent("$0.00");
  });

  it("splits the total per person, labelled by name (D11)", () => {
    render(
      <SpendingSummary
        totalMinor={124850}
        personTotals={totals}
        from="2026-10-25"
        to="2026-11-01"
      />,
    );
    const husband = screen.getByTestId("total-husband");
    const wife = screen.getByTestId("total-wife");
    expect(husband).toHaveTextContent("Husband");
    expect(husband).toHaveTextContent("$1,000.00");
    expect(wife).toHaveTextContent("Wife");
    expect(wife).toHaveTextContent("$248.50");
  });

  it("the two halves add up to the displayed total", () => {
    render(
      <SpendingSummary
        totalMinor={totals.husbandMinor + totals.wifeMinor}
        personTotals={totals}
        from="2026-10-25"
        to="2026-11-01"
      />,
    );
    expect(screen.getByTestId("spending-total")).toHaveTextContent("$1,248.50");
  });
});
