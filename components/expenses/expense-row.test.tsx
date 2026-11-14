import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpenseRow } from "./expense-row";

const expense = {
  id: 7,
  userId: 1,
  categoryId: 2,
  spentOn: "2026-10-31",
  merchant: "Trader Joe's",
  amountMinor: 8530,
  notes: null,
  person: "husband" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ExpenseRow", () => {
  it("shows the merchant as a link to the detail screen", () => {
    render(<ExpenseRow expense={expense} categoryName="Food" />);
    const link = screen.getByRole("link", { name: "Trader Joe's" });
    expect(link).toHaveAttribute("href", "/expenses/7");
  });

  it("shows category, date, and formatted amount", () => {
    render(<ExpenseRow expense={expense} categoryName="Food" />);
    expect(screen.getByText(/Food/)).toBeInTheDocument();
    expect(screen.getByText(/Oct 31, 2026/)).toBeInTheDocument();
    expect(screen.getByText("$85.30")).toBeInTheDocument();
  });

  it("colours a husband's expense with the husband token (D11)", () => {
    render(<ExpenseRow expense={expense} categoryName="Food" />);
    expect(screen.getByText("$85.30")).toHaveClass("text-person-husband");
  });

  it("colours a wife's expense with the wife token (D11)", () => {
    render(
      <ExpenseRow
        expense={{ ...expense, person: "wife" }}
        categoryName="Food"
      />,
    );
    expect(screen.getByText("$85.30")).toHaveClass("text-person-wife");
  });

  it("names the person in text, so colour is never the only cue (SPEC §6.1)", () => {
    render(<ExpenseRow expense={expense} categoryName="Food" />);
    expect(screen.getByText(/Husband/)).toBeInTheDocument();

    render(
      <ExpenseRow
        expense={{ ...expense, id: 8, person: "wife" }}
        categoryName="Food"
      />,
    );
    expect(screen.getByText(/Wife/)).toBeInTheDocument();
  });
});
