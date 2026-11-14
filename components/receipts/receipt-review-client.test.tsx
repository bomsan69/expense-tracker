import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSaveBatch = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("@/app/(app)/receipt/review/actions", () => ({
  saveBatchAction: (...args: unknown[]) => mockSaveBatch(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const { ReceiptReviewClient } = await import("./receipt-review-client");

const categories = [
  { id: 1, userId: 1, name: "Food", nameNormalized: "food", createdAt: new Date(), updatedAt: new Date() },
];

const draft = {
  filename: "grocery.jpg",
  items: [
    { spentOn: "2026-11-01", categoryId: 1, merchant: "Milk", amountMinor: 499, isDuplicate: false },
    { spentOn: "2026-11-01", categoryId: 1, merchant: "Bread", amountMinor: 349, isDuplicate: true },
  ],
  person: "husband" as const,
};

beforeEach(() => {
  mockSaveBatch.mockReset();
  mockPush.mockReset();
  mockReplace.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

describe("ReceiptReviewClient", () => {
  it("redirects to Add Expense when there is no draft", async () => {
    render(<ReceiptReviewClient categories={categories} />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/expenses/new"));
  });

  it("shows the filename, items, duplicate warning, and reconciled total", async () => {
    sessionStorage.setItem("receipt_draft", JSON.stringify(draft));
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText(/grocery\.jpg/);
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
    expect(
      screen.getByText("Possible duplicate of an existing expense"),
    ).toBeInTheDocument();
    expect(screen.getByText("Total · 2 items")).toBeInTheDocument();
    expect(screen.getByText("$8.48")).toBeInTheDocument();
  });

  it("removing a row updates the total and disables save when empty", async () => {
    sessionStorage.setItem(
      "receipt_draft",
      JSON.stringify({
        filename: "r.jpg",
        items: [draft.items[0]],
        person: "husband",
      }),
    );
    const user = userEvent.setup();
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText("Total · 0 items")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm & Save All" }),
    ).toBeDisabled();
  });

  it("confirms and saves all, clearing the draft on success", async () => {
    sessionStorage.setItem("receipt_draft", JSON.stringify(draft));
    mockSaveBatch.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Confirm & Save All" }));

    await waitFor(() => expect(mockSaveBatch).toHaveBeenCalled());
    const [rows] = mockSaveBatch.mock.calls[0] as [
      { spentOn: string; categoryId: string; merchant: string; amountMinor: string }[],
    ];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      spentOn: "2026-11-01",
      categoryId: "1",
      merchant: "Milk",
      amountMinor: "4.99",
      person: "husband",
    });
  });

  it("defaults the receipt to Husband and applies a switch to every row (D11)", async () => {
    sessionStorage.setItem("receipt_draft", JSON.stringify(draft));
    mockSaveBatch.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText("Milk");
    expect(screen.getByLabelText(/^Entered by/)).toHaveTextContent("Husband");

    await user.click(screen.getByLabelText(/^Entered by/));
    await user.click(await screen.findByRole("option", { name: "Wife" }));
    await user.click(screen.getByRole("button", { name: "Confirm & Save All" }));

    await waitFor(() => expect(mockSaveBatch).toHaveBeenCalled());
    const [rows] = mockSaveBatch.mock.calls[0] as [{ person: string }[]];
    expect(rows.map((row) => row.person)).toEqual(["wife", "wife"]);
  });

  it("keeps the chosen person after a failed batch save", async () => {
    sessionStorage.setItem("receipt_draft", JSON.stringify(draft));
    mockSaveBatch.mockResolvedValue({
      ok: false,
      error: "Nothing was saved. Fix the highlighted rows and try again.",
    });
    const user = userEvent.setup();
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText("Milk");
    await user.click(screen.getByLabelText(/^Entered by/));
    await user.click(await screen.findByRole("option", { name: "Wife" }));
    await user.click(screen.getByRole("button", { name: "Confirm & Save All" }));

    await screen.findByText(
      "Nothing was saved. Fix the highlighted rows and try again.",
    );
    expect(screen.getByLabelText(/^Entered by/)).toHaveTextContent("Wife");
  });

  it("on batch failure, shows the error, names the row, and preserves all edits", async () => {
    sessionStorage.setItem("receipt_draft", JSON.stringify(draft));
    mockSaveBatch.mockResolvedValue({
      ok: false,
      error: "Nothing was saved. Fix the highlighted rows and try again.",
      rowErrors: [null, "Enter an amount greater than 0."],
    });
    const user = userEvent.setup();
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText("Milk");
    await user.click(screen.getByRole("button", { name: "Confirm & Save All" }));

    await screen.findByText(
      "Nothing was saved. Fix the highlighted rows and try again.",
    );
    expect(screen.getByText("Enter an amount greater than 0.")).toBeInTheDocument();
    // Both rows still present — nothing was discarded.
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  it("cancel clears the draft and navigates to Add Expense", async () => {
    sessionStorage.setItem("receipt_draft", JSON.stringify(draft));
    const user = userEvent.setup();
    render(<ReceiptReviewClient categories={categories} />);

    await screen.findByText("Milk");
    await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]!);

    expect(mockPush).toHaveBeenCalledWith("/expenses/new");
    expect(sessionStorage.getItem("receipt_draft")).toBeNull();
    expect(mockSaveBatch).not.toHaveBeenCalled();
  });
});
