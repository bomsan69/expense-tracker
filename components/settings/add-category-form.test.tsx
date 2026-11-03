import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockCreate = vi.fn();
const mockRefresh = vi.fn();
vi.mock("@/app/(app)/settings/categories/actions", () => ({
  createCategoryAction: (...args: unknown[]) => mockCreate(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const { AddCategoryForm } = await import("./add-category-form");

describe("AddCategoryForm", () => {
  it("submits the typed name", async () => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      ok: true,
      data: { id: 1, name: "Food" },
    });
    const user = userEvent.setup();
    render(<AddCategoryForm />);

    await user.type(screen.getByLabelText(/^New Category Name/), "Food");
    await user.click(screen.getByRole("button", { name: "Add Category" }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const [, formData] = mockCreate.mock.calls[0] as [unknown, FormData];
    expect(formData.get("name")).toBe("Food");
  });

  it("shows a duplicate-name error and preserves the typed value", async () => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({
      ok: false,
      error: "A category with this name already exists.",
    });
    const user = userEvent.setup();
    render(<AddCategoryForm />);

    await user.type(screen.getByLabelText(/^New Category Name/), "Food");
    await user.click(screen.getByRole("button", { name: "Add Category" }));

    await screen.findByText("A category with this name already exists.");
    expect(screen.getByLabelText(/^New Category Name/)).toHaveValue("Food");
  });
});
