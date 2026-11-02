import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    static AuthenticationError = MockAuthenticationError;
    static PermissionDeniedError = MockPermissionDeniedError;
    static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
    messages = { create: mockCreate };
  }
  return { default: MockAnthropic };
});

const { parseReceipt } = await import("./parse-receipt");

beforeEach(() => {
  mockCreate.mockReset();
});

function textResponse(payload: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(payload) }] };
}

describe("parseReceipt", () => {
  it("rejects HEIC before calling the provider", async () => {
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/heic",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: false,
      error: "unsupported_format",
      message: expect.stringContaining("HEIC"),
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("parses line items into minor units", async () => {
    mockCreate.mockResolvedValue(
      textResponse({
        items: [
          { date: "2026-10-31", merchant: "Trader Joe's", amount: "12.99" },
          { date: "2026-10-31", merchant: "Trader Joe's", amount: "4.50" },
        ],
      }),
    );
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: true,
      items: [
        { spentOn: "2026-10-31", merchant: "Trader Joe's", amountMinor: 1299 },
        { spentOn: "2026-10-31", merchant: "Trader Joe's", amountMinor: 450 },
      ],
    });
  });

  it("drops items with an invalid amount or date instead of failing the whole parse", async () => {
    mockCreate.mockResolvedValue(
      textResponse({
        items: [
          { date: "2026-10-31", merchant: "Good", amount: "5.00" },
          { date: "not-a-date", merchant: "Bad date", amount: "5.00" },
          { date: "2026-10-31", merchant: "Bad amount", amount: "abc" },
        ],
      }),
    );
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: true,
      items: [{ spentOn: "2026-10-31", merchant: "Good", amountMinor: 500 }],
    });
  });

  it("returns no_items when the model finds nothing", async () => {
    mockCreate.mockResolvedValue(textResponse({ items: [] }));
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: false,
      error: "no_items",
      message: expect.stringContaining("No expense items"),
    });
  });

  it("maps an authentication error to the auth failure without echoing the key", async () => {
    mockCreate.mockRejectedValue(new MockAuthenticationError("unauthorized"));
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "sk.ant.should.never.appear",
    });
    expect(result).toEqual({
      ok: false,
      error: "auth",
      message: expect.stringContaining("rejected"),
    });
    expect(JSON.stringify(result)).not.toContain("sk.ant.should.never.appear");
  });

  it("maps a permission-denied error to the auth failure", async () => {
    mockCreate.mockRejectedValue(new MockPermissionDeniedError("no credit"));
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("auth");
  });

  it("maps a timeout error to the timeout failure", async () => {
    mockCreate.mockRejectedValue(new MockAPIConnectionTimeoutError("timed out"));
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: false,
      error: "timeout",
      message: expect.stringContaining("timed out"),
    });
  });

  it("passes a timeout option to the provider call", async () => {
    mockCreate.mockResolvedValue(textResponse({ items: [] }));
    await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeout: 30_000 }),
    );
  });
});
