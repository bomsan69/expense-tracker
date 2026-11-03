import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSave = vi.fn();
const mockVerify = vi.fn();
vi.mock("@/app/(app)/settings/actions", () => ({
  saveAiSettingsAction: (...args: unknown[]) => mockSave(...args),
  verifyAiSettingsAction: (...args: unknown[]) => mockVerify(...args),
}));

const { AiSettingsForm } = await import("./ai-settings-form");

describe("AiSettingsForm", () => {
  it("shows the masked key as a placeholder, never as the field value", () => {
    render(<AiSettingsForm initialModel="gpt-4o-mini" maskedKey="••••••••1234" />);
    const keyInput = screen.getByLabelText(/^API Key/) as HTMLInputElement;
    expect(keyInput.value).toBe("");
    expect(keyInput).toHaveAttribute("placeholder", "••••••••1234");
    expect(keyInput).toHaveAttribute("type", "password");
  });

  it("submits a blank key field to mean 'keep existing'", async () => {
    mockSave.mockReset();
    mockSave.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<AiSettingsForm initialModel="gpt-4o-mini" maskedKey="••••••••1234" />);

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    const [, formData] = mockSave.mock.calls[0] as [unknown, FormData];
    expect(formData.get("aiApiKey")).toBe("");
    expect(formData.get("aiModel")).toBe("gpt-4o-mini");
  });

  it("shows an inline error on an invalid model", async () => {
    mockSave.mockReset();
    mockSave.mockResolvedValue({ ok: false, error: "Enter an AI model name." });
    const user = userEvent.setup();
    render(<AiSettingsForm initialModel="" maskedKey={null} />);

    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    await screen.findByText("Enter an AI model name.");
  });

  it("clicking Verify calls the verify action with the typed fields, not save", async () => {
    mockVerify.mockReset();
    mockVerify.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<AiSettingsForm initialModel="gpt-4o-mini" maskedKey="••••••••1234" />);

    await user.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalled());
    expect(mockSave).not.toHaveBeenCalled();
    await screen.findByText("Connection verified.");
  });

  it("shows an inline error when verification fails", async () => {
    mockVerify.mockReset();
    mockVerify.mockResolvedValue({
      ok: false,
      error: "Your AI API key was rejected. Check it in Settings.",
    });
    const user = userEvent.setup();
    render(<AiSettingsForm initialModel="gpt-4o-mini" maskedKey="••••••••1234" />);

    await user.click(screen.getByRole("button", { name: "Verify" }));
    await screen.findByText("Your AI API key was rejected. Check it in Settings.");
  });
});
