import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSessionToken } from "@/lib/auth/session";
import { encryptApiKey } from "@/lib/crypto/api-key";
import { createCategory } from "@/lib/queries/categories";
import { countExpenses, createExpense } from "@/lib/queries/expenses";
import { saveAiSettings } from "@/lib/queries/settings";
import { createTestUser, deleteTestUser } from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";
import { todayIso } from "@/lib/dates";

const cookieJar = createMockCookieJar();
const mockRedirect = vi.fn(createMockRedirect());

const {
  mockCreate,
  MockAuthenticationError,
  MockPermissionDeniedError,
  MockAPIConnectionTimeoutError,
} = vi.hoisted(() => {
    class MockAuthenticationError extends Error {}
    class MockPermissionDeniedError extends Error {}
    class MockAPIConnectionTimeoutError extends Error {}
    return {
      mockCreate: vi.fn(),
      MockAuthenticationError,
      MockPermissionDeniedError,
      MockAPIConnectionTimeoutError,
    };
  });

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));
vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    static AuthenticationError = MockAuthenticationError;
    static PermissionDeniedError = MockPermissionDeniedError;
    static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

const { createExpenseAction, parseReceiptAction } = await import(
  "./actions"
);

let userId: number;
let categoryId: number;

function formData(fields: Record<string, FormDataEntryValue>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

function receiptTextResponse(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

beforeEach(async () => {
  mockRedirect.mockClear();
  mockCreate.mockReset();
  const user = await createTestUser();
  userId = user.id;
  const category = await createCategory(userId, "Food");
  if (!category.ok) throw new Error("setup failed");
  categoryId = category.category.id;
  const token = await signSessionToken({ userId, tokenVersion: 0 });
  cookieJar.jar.set("session", token);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("createExpenseAction", () => {
  it("creates the expense and redirects home", async () => {
    await expect(
      createExpenseAction(
        undefined,
        formData({
          spentOn: todayIso(),
          categoryId: String(categoryId),
          merchant: "Trader Joe's",
          amountMinor: "42.10",
        }),
      ),
    ).rejects.toThrow("/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(await countExpenses(userId, { from: todayIso(), to: todayIso() })).toBe(1);
  });

  it("blocks save on an invalid amount", async () => {
    const result = await createExpenseAction(
      undefined,
      formData({
        spentOn: todayIso(),
        categoryId: String(categoryId),
        merchant: "Trader Joe's",
        amountMinor: "0",
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Enter an amount greater than 0.",
    });
    expect(await countExpenses(userId, { from: todayIso(), to: todayIso() })).toBe(0);
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      createExpenseAction(
        undefined,
        formData({
          spentOn: todayIso(),
          categoryId: String(categoryId),
          merchant: "X",
          amountMinor: "1.00",
        }),
      ),
    ).rejects.toThrow("/login");
  });
});

describe("parseReceiptAction", () => {
  function imageFile(type = "image/jpeg"): File {
    return new File([new Uint8Array([1, 2, 3])], "receipt.jpg", { type });
  }

  it("rejects an unsupported image format before calling the provider", async () => {
    const result = await parseReceiptAction(
      undefined,
      formData({ image: new File(["x"], "r.gif", { type: "image/gif" }) }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Choose a JPEG, PNG, WebP, or HEIC image.",
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("requires AI settings to be configured first", async () => {
    const result = await parseReceiptAction(
      undefined,
      formData({ image: imageFile() }),
    );
    expect(result).toEqual({
      ok: false,
      error:
        "Add your AI model and API key in Settings before scanning a receipt.",
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("parses items, flags duplicates, and never auto-saves", async () => {
    await saveAiSettings(userId, {
      aiModel: "claude-sonnet-5",
      aiApiKeyCiphertext: encryptApiKey("sk-ant-key"),
      aiApiKeyLast4: "-key",
    });
    const existing = await createExpense(userId, {
      spentOn: "2026-10-31",
      categoryId,
      merchant: "Trader Joe's",
      amountMinor: 1299,
    });

    mockCreate.mockResolvedValue(
      receiptTextResponse({
        items: [
          { date: "2026-10-31", merchant: "Trader Joe's", amount: "12.99" },
          { date: "2026-10-31", merchant: "New Place", amount: "5.00" },
        ],
      }),
    );

    const result = await parseReceiptAction(
      undefined,
      formData({ image: imageFile() }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          spentOn: "2026-10-31",
          merchant: "Trader Joe's",
          amountMinor: 1299,
          isDuplicate: true,
        },
        {
          spentOn: "2026-10-31",
          merchant: "New Place",
          amountMinor: 500,
          isDuplicate: false,
        },
      ]);
    }

    // Nothing written: only the one pre-existing fixture row remains.
    const total = await countExpenses(userId, {
      from: "2026-10-31",
      to: "2026-10-31",
    });
    expect(total).toBe(1);
    expect(existing.id).toBeDefined();
  });

  it("passes through the AI timeout message", async () => {
    await saveAiSettings(userId, {
      aiModel: "claude-sonnet-5",
      aiApiKeyCiphertext: encryptApiKey("sk-ant-key"),
      aiApiKeyLast4: "-key",
    });
    mockCreate.mockRejectedValue(new MockAPIConnectionTimeoutError("timeout"));

    const result = await parseReceiptAction(
      undefined,
      formData({ image: imageFile() }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Receipt scanning timed out. Try again or enter the expense manually.",
    });
  });

  it("never echoes the decrypted API key on an auth failure", async () => {
    await saveAiSettings(userId, {
      aiModel: "claude-sonnet-5",
      aiApiKeyCiphertext: encryptApiKey("sk-ant-should-never-appear"),
      aiApiKeyLast4: "pear",
    });
    mockCreate.mockRejectedValue(new MockAuthenticationError("unauthorized"));

    const result = await parseReceiptAction(
      undefined,
      formData({ image: imageFile() }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Your AI API key was rejected. Check it in Settings.",
    });
    expect(JSON.stringify(result)).not.toContain("sk-ant-should-never-appear");
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      parseReceiptAction(undefined, formData({ image: imageFile() })),
    ).rejects.toThrow("/login");
  });
});
