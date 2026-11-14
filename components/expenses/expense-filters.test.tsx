import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/",
}));

const { ExpenseFilters } = await import("./expense-filters");

const categories = [
  { id: 1, userId: 1, name: "Food", nameNormalized: "food", createdAt: new Date(), updatedAt: new Date() },
  { id: 2, userId: 1, name: "Travel", nameNormalized: "travel", createdAt: new Date(), updatedAt: new Date() },
];

describe("ExpenseFilters", () => {
  it("renders From, To, and Category controls", () => {
    render(
      <ExpenseFilters
        from="2026-10-25"
        to="2026-11-01"
        categoryId="all"
        person="all"
        categories={categories}
      />,
    );
    expect(screen.getByLabelText(/^From/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^To/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Entered by/)).toBeInTheDocument();
  });

  it("defaults the person filter to Everyone (D11)", () => {
    render(
      <ExpenseFilters
        from="2026-10-25"
        to="2026-11-01"
        categoryId="all"
        person="all"
        categories={categories}
      />,
    );
    expect(screen.getByLabelText(/^Entered by/)).toHaveTextContent("Everyone");
  });

  it("navigates with the chosen person and resets to page 1", async () => {
    mockPush.mockClear();
    const user = userEvent.setup();
    render(
      <ExpenseFilters
        from="2026-10-25"
        to="2026-11-01"
        categoryId="all"
        person="all"
        categories={categories}
      />,
    );
    await user.click(screen.getByLabelText(/^Entered by/));
    await user.click(await screen.findByRole("option", { name: "Wife" }));

    const lastCall = mockPush.mock.calls.at(-1)?.[0] as string;
    const params = new URLSearchParams(lastCall.split("?")[1]);
    expect(params.get("person")).toBe("wife");
    expect(params.has("page")).toBe(false);
  });

  it("carries the active person through a date change", async () => {
    mockPush.mockClear();
    const user = userEvent.setup();
    render(
      <ExpenseFilters
        from="2026-10-25"
        to="2026-11-01"
        categoryId="all"
        person="wife"
        categories={categories}
      />,
    );
    const fromInput = screen.getByLabelText(/^From/);
    await user.clear(fromInput);
    await user.type(fromInput, "2026-10-01");

    const lastCall = mockPush.mock.calls.at(-1)?.[0] as string;
    expect(new URLSearchParams(lastCall.split("?")[1]).get("person")).toBe(
      "wife",
    );
  });

  it("navigates with the new From date and resets to page 1", async () => {
    mockPush.mockClear();
    const user = userEvent.setup();
    render(
      <ExpenseFilters
        from="2026-10-25"
        to="2026-11-01"
        categoryId="all"
        person="all"
        categories={categories}
      />,
    );
    const fromInput = screen.getByLabelText(/^From/);
    await user.clear(fromInput);
    await user.type(fromInput, "2026-10-01");

    expect(mockPush).toHaveBeenCalled();
    const lastCall = mockPush.mock.calls.at(-1)?.[0] as string;
    const params = new URLSearchParams(lastCall.split("?")[1]);
    expect(params.has("page")).toBe(false);
    expect(params.get("to")).toBe("2026-11-01");
  });

  it("shows the range-validation error on the To field", () => {
    render(
      <ExpenseFilters
        from="2026-11-01"
        to="2026-10-25"
        categoryId="all"
        person="all"
        categories={categories}
        error="The start date must be on or before the end date."
      />,
    );
    expect(
      screen.getByText("The start date must be on or before the end date."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^From/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
