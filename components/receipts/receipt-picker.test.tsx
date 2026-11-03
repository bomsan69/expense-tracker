import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockParseReceipt = vi.fn();
const mockPush = vi.fn();

vi.mock("@/app/(app)/expenses/new/actions", () => ({
  parseReceiptAction: (...args: unknown[]) => mockParseReceipt(...args),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const { ReceiptPicker } = await import("./receipt-picker");

beforeEach(() => {
  mockParseReceipt.mockReset();
  mockPush.mockReset();
  sessionStorage.clear();
});

function makeFile(): File {
  return new File([new Uint8Array([1, 2, 3])], "receipt.jpg", {
    type: "image/jpeg",
  });
}

const categories = [
  {
    id: 1,
    userId: 1,
    name: "Food",
    nameNormalized: "food",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("ReceiptPicker", () => {
  it("renders Take Photo and Choose from Album buttons", () => {
    render(<ReceiptPicker categories={categories} />);
    expect(
      screen.getByRole("button", { name: /Take Photo/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Choose from Album/ }),
    ).toBeInTheDocument();
  });

  it("on a successful parse, stores the draft and navigates to review", async () => {
    mockParseReceipt.mockResolvedValue({
      ok: true,
      data: [
        {
          spentOn: "2026-10-31",
          merchant: "Trader Joe's",
          amountMinor: 1299,
          isDuplicate: false,
        },
      ],
    });
    const user = userEvent.setup();
    render(<ReceiptPicker categories={categories} />);

    const input = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;
    await user.upload(input, makeFile());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/receipt/review"));
    const stored = JSON.parse(sessionStorage.getItem("receipt_draft") ?? "{}");
    expect(stored.filename).toBe("receipt.jpg");
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].categoryId).toBe(1);
  });

  it("shows the AI failure message and does not navigate when parsing fails", async () => {
    mockParseReceipt.mockResolvedValue({
      ok: false,
      error: "Receipt scanning timed out. Try again or enter the expense manually.",
    });
    const user = userEvent.setup();
    render(<ReceiptPicker categories={categories} />);

    const input = document.querySelector(
      'input[type="file"]:not([capture])',
    ) as HTMLInputElement;
    await user.upload(input, makeFile());

    await screen.findByText(
      "Receipt scanning timed out. Try again or enter the expense manually.",
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("receipt_draft")).toBeNull();
  });
});
