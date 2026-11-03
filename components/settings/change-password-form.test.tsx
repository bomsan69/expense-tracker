import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockChangePassword = vi.fn();
const mockPush = vi.fn();
vi.mock("@/app/(app)/settings/password/actions", () => ({
  changePasswordAction: (...args: unknown[]) => mockChangePassword(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const { ChangePasswordForm } = await import("./change-password-form");

describe("ChangePasswordForm", () => {
  it("renders three masked inputs and the policy message", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText(/^Current Password/)).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText(/^New Password/)).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText(/^Confirm New Password/)).toHaveAttribute(
      "type",
      "password",
    );
    expect(
      screen.getByText(/at least 10 characters with a letter and a number/),
    ).toBeInTheDocument();
  });

  async function fillAllFields(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/^Current Password/), "current.pass1");
    await user.type(screen.getByLabelText(/^New Password/), "new.password1");
    await user.type(
      screen.getByLabelText(/^Confirm New Password/),
      "new.password1",
    );
  }

  it("shows the wrong-current-password error", async () => {
    mockChangePassword.mockReset();
    mockChangePassword.mockResolvedValue({
      ok: false,
      error: "Your current password is incorrect.",
    });
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: "Update Password" }));
    await screen.findByText("Your current password is incorrect.");
  });

  it("shows a success confirmation on success", async () => {
    mockChangePassword.mockReset();
    mockChangePassword.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: "Update Password" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Password updated",
      ),
    );
  });
});
