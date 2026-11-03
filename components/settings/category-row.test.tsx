import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRename = vi.fn();
const mockRefresh = vi.fn();
vi.mock("@/app/(app)/settings/categories/actions", () => ({
  renameCategoryAction: (...args: unknown[]) => mockRename(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const { CategoryRow } = await import("./category-row");

const category = {
  id: 3,
  userId: 1,
  name: "Food",
  nameNormalized: "food",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("CategoryRow", () => {
  it("shows the name and an Edit action by default", () => {
    render(<CategoryRow category={category} />);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("switches to edit mode and submits the rename", async () => {
    mockRename.mockReset();
    mockRename.mockResolvedValue({
      ok: true,
      data: { ...category, name: "Groceries" },
    });
    const user = userEvent.setup();
    render(<CategoryRow category={category} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByDisplayValue("Food");
    await user.clear(input);
    await user.type(input, "Groceries");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockRename).toHaveBeenCalledWith(undefined, expect.anything()));
    await screen.findByText("Groceries");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("cancel returns to display mode without submitting", async () => {
    mockRename.mockReset();
    const user = userEvent.setup();
    render(<CategoryRow category={category} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockRename).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("shows a duplicate-name error inline", async () => {
    mockRename.mockReset();
    mockRename.mockResolvedValue({
      ok: false,
      error: "A category with this name already exists.",
    });
    const user = userEvent.setup();
    render(<CategoryRow category={category} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("A category with this name already exists.");
  });
});
