import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogout = vi.fn();
vi.mock("@/app/(app)/settings/actions", () => ({
  logoutAction: (...args: unknown[]) => mockLogout(...args),
}));

const { LogoutButton } = await import("./logout-button");

describe("LogoutButton", () => {
  it("calls logoutAction when clicked", async () => {
    mockLogout.mockReset();
    mockLogout.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: "Log Out" }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
