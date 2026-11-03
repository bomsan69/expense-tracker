import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExpenseForm } from "./expense-form";

const categories = [
  {
    id: 1,
    userId: 1,
    name: "Food",
    nameNormalized: "food",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    userId: 1,
    name: "Travel",
    nameNormalized: "travel",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const emptyDefaults = {
  spentOn: "2026-10-31",
  categoryId: null,
  merchant: "",
  amountMinor: null,
  notes: "",
};

describe("ExpenseForm", () => {
  it("renders every field with a visible label", () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseForm
        action={action}
        categories={categories}
        defaultValues={emptyDefaults}
        submitLabel="Save Expense"
      />,
    );
    expect(screen.getByLabelText(/^Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Merchant/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Amount/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Notes/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Expense" }),
    ).toBeInTheDocument();
  });

  it("pre-fills from defaultValues for editing", () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(
      <ExpenseForm
        action={action}
        categories={categories}
        submitLabel="Save Changes"
        defaultValues={{
          spentOn: "2026-10-31",
          categoryId: 2,
          merchant: "Uber",
          amountMinor: 1940,
          notes: "ride",
        }}
      />,
    );
    expect(screen.getByLabelText(/^Merchant/)).toHaveValue("Uber");
    expect(screen.getByLabelText(/^Amount/)).toHaveValue("19.40");
    expect(screen.getByLabelText(/^Notes/)).toHaveValue("ride");
  });

  it("submits the typed values via FormData", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ExpenseForm
        action={action}
        categories={categories}
        defaultValues={emptyDefaults}
        submitLabel="Save Expense"
      />,
    );

    await user.click(screen.getByLabelText(/^Category/));
    await user.click(await screen.findByRole("option", { name: "Food" }));
    await user.type(screen.getByLabelText(/^Merchant/), "Trader Joe's");
    await user.type(screen.getByLabelText(/^Amount/), "42.10");
    await user.click(screen.getByRole("button", { name: "Save Expense" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const [, formData] = action.mock.calls[0] as [unknown, FormData];
    expect(formData.get("merchant")).toBe("Trader Joe's");
    expect(formData.get("amountMinor")).toBe("42.10");
    expect(formData.get("categoryId")).toBe("1");
  });

  it("preserves typed input when the action fails", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: false, error: "Enter an amount greater than 0." });
    const user = userEvent.setup();
    render(
      <ExpenseForm
        action={action}
        categories={categories}
        defaultValues={emptyDefaults}
        submitLabel="Save Expense"
      />,
    );

    await user.type(screen.getByLabelText(/^Merchant/), "Trader Joe's");
    await user.type(screen.getByLabelText(/^Amount/), "0");
    await user.click(screen.getByRole("button", { name: "Save Expense" }));

    await screen.findByText("Enter an amount greater than 0.");
    expect(screen.getByLabelText(/^Merchant/)).toHaveValue("Trader Joe's");
    expect(screen.getByLabelText(/^Amount/)).toHaveValue("0");
  });

  it("calls onDirtyChange when a field changes", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpenseForm
        action={action}
        categories={categories}
        defaultValues={emptyDefaults}
        submitLabel="Save Expense"
        onDirtyChange={onDirtyChange}
      />,
    );
    await user.type(screen.getByLabelText(/^Merchant/), "U");
    expect(onDirtyChange).toHaveBeenCalledWith(true);
  });
});
