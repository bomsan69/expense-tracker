import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogin = vi.fn();
vi.mock("@/app/(auth)/login/actions", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
}));

const { LoginForm } = await import("./login-form");

describe("LoginForm", () => {
  it("renders labeled email and password fields and a Sign In button", () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginForm />);
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("submits the typed credentials to the login action", async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    const [, formData] = mockLogin.mock.calls[0] as [unknown, FormData];
    expect(formData.get("email")).toBe("user@example.com");
    expect(formData.get("password")).toBe("secret123");
  });

  it("submits on Enter from within the password field (keyboard-only)", async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123{Enter}");

    await waitFor(() => expect(mockLogin).toHaveBeenCalled());
  });

  it("disables the submit button while pending", async () => {
    let resolveLogin: (value: unknown) => void = () => {};
    mockLogin.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByRole("button", { name: /Signing In/ })).toBeDisabled();
    resolveLogin(undefined);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign In" })).toBeEnabled(),
    );
  });

  it("shows a single generic error and marks both fields invalid, without clearing input", async () => {
    mockLogin.mockResolvedValue({
      ok: false,
      error: "Invalid email or password.",
    });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email/), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const error = await screen.findByText("Invalid email or password.");
    expect(error).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    // Form data preserved on failure.
    expect(screen.getByLabelText(/^Email/)).toHaveValue("user@example.com");
  });
});
