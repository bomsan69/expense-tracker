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
});
