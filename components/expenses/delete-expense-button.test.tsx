import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockDelete = vi.fn();
vi.mock("@/app/(app)/expenses/[id]/actions", () => ({
  deleteExpenseAction: (...args: unknown[]) => mockDelete(...args),
}));

const { DeleteExpenseButton } = await import("./delete-expense-button");

describe("DeleteExpenseButton", () => {
  it("requires confirmation before deleting", async () => {
    mockDelete.mockClear();
    const user = userEvent.setup();
    render(<DeleteExpenseButton id={5} />);

    await user.click(screen.getByRole("button", { name: "Delete Expense" }));
    expect(mockDelete).not.toHaveBeenCalled();

    expect(
      screen.getByRole("alertdialog", { name: "Delete expense?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This will permanently delete the expense from your records.",
      ),
    ).toBeInTheDocument();
  });

  it("calls deleteExpenseAction with the id after confirming", async () => {
    mockDelete.mockClear();
    mockDelete.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DeleteExpenseButton id={5} />);

    await user.click(screen.getByRole("button", { name: "Delete Expense" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Expense" }),
    );

    expect(mockDelete).toHaveBeenCalledWith(5);
  });

  it("cancel closes the dialog without deleting", async () => {
    mockDelete.mockClear();
    const user = userEvent.setup();
    render(<DeleteExpenseButton id={5} />);

    await user.click(screen.getByRole("button", { name: "Delete Expense" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
