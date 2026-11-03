import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpendingSummary } from "./spending-summary";

describe("SpendingSummary", () => {
  it("formats the total and date range", () => {
    render(
      <SpendingSummary totalMinor={124850} from="2026-10-25" to="2026-11-01" />,
    );
    expect(screen.getByText("$1,248.50")).toBeInTheDocument();
    expect(screen.getByText(/Oct 25, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Nov 1, 2026/)).toBeInTheDocument();
  });

  it("shows $0.00 for an empty result (STATE-02)", () => {
    render(<SpendingSummary totalMinor={0} from="2026-10-25" to="2026-11-01" />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
