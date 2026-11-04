import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { todayIso } from "@/lib/dates";

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

vi.mock("openai", () => {
  class MockOpenAI {
    static AuthenticationError = MockAuthenticationError;
    static PermissionDeniedError = MockPermissionDeniedError;
    static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
    chat = { completions: { create: mockCreate } };
  }
  return { default: MockOpenAI };
});

const { parseReceipt } = await import("./parse-receipt");

beforeEach(() => {
  mockCreate.mockReset();
});

function textResponse(payload: unknown) {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

// Other test files run concurrently in separate vitest workers and append
// to this same shared logs/<date>.log file, so a raw "N new lines since
// before" count would be flaky — filter to this module's own `action` tag
// to isolate from that cross-file interleaving.
function newParseReceiptLogLines(linesBefore: number): Record<string, unknown>[] {
  const date = new Date().toISOString().slice(0, 10);
  const path = join(process.cwd(), "logs", `${date}.log`);
  let lines: string[];
  try {
    lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
  } catch {
    lines = [];
  }
  return lines
    .slice(linesBefore)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((entry) => entry.action === "parseReceipt");
}

function todaysLogLineCount(): number {
  const date = new Date().toISOString().slice(0, 10);
  const path = join(process.cwd(), "logs", `${date}.log`);
  try {
    return readFileSync(path, "utf8").trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

describe("parseReceipt", () => {
  it("rejects HEIC before calling the provider", async () => {
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/heic",
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
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

  it("drops items with an invalid amount instead of failing the whole parse", async () => {
    mockCreate.mockResolvedValue(
      textResponse({
        items: [
          { date: "2026-10-31", merchant: "Good", amount: "5.00" },
          { date: "2026-10-31", merchant: "Bad amount", amount: "abc" },
        ],
      }),
    );
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-4o-mini",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: true,
      items: [{ spentOn: "2026-10-31", merchant: "Good", amountMinor: 500 }],
    });
  });

  it("falls back to today's date instead of dropping the item when the model leaves the date blank or unparseable", async () => {
    mockCreate.mockResolvedValue(
      textResponse({
        items: [
          { date: "", merchant: "Blank date", amount: "5.00" },
          { date: "not-a-date", merchant: "Garbled date", amount: "6.00" },
          { date: "2026-10-31", merchant: "Good date", amount: "7.00" },
        ],
      }),
    );
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-4o-mini",
      apiKey: "key",
    });
    const today = todayIso();
    expect(result).toEqual({
      ok: true,
      items: [
        { spentOn: today, merchant: "Blank date", amountMinor: 500 },
        { spentOn: today, merchant: "Garbled date", amountMinor: 600 },
        { spentOn: "2026-10-31", merchant: "Good date", amountMinor: 700 },
      ],
    });
  });

  it("returns no_items when the model finds nothing, and logs the raw response for diagnosis", async () => {
    mockCreate.mockResolvedValue(textResponse({ items: [] }));
    const linesBefore = todaysLogLineCount();
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-4o-mini",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: false,
      error: "no_items",
      message: expect.stringContaining("No expense items"),
    });

    const newLines = newParseReceiptLogLines(linesBefore);
    expect(newLines).toHaveLength(1);
    expect(newLines[0]).toMatchObject({
      action: "parseReceipt",
      model: "gpt-4o-mini",
      reason: "zero_items",
      rawItemCount: 0,
    });
  });

  it("logs the raw response when every item gets filtered out as invalid", async () => {
    mockCreate.mockResolvedValue(
      textResponse({
        items: [{ date: "2026-10-31", merchant: "Bad amount", amount: "abc" }],
      }),
    );
    const linesBefore = todaysLogLineCount();
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-4o-mini",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: false,
      error: "no_items",
      message: expect.stringContaining("No expense items"),
    });

    const newLines = newParseReceiptLogLines(linesBefore);
    expect(newLines).toHaveLength(1);
    expect(newLines[0]).toMatchObject({
      reason: "zero_items",
      rawItemCount: 1,
    });
  });

  it("logs the real cause of an unexpected provider error instead of mislabeling it no_items", async () => {
    mockCreate.mockRejectedValue(new Error("model not found: gpt-nope"));
    const linesBefore = todaysLogLineCount();
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-nope",
      apiKey: "key",
    });
    expect(result).toEqual({
      ok: false,
      error: "no_items",
      message: expect.stringContaining("No expense items"),
    });

    const newLines = newParseReceiptLogLines(linesBefore);
    expect(newLines).toHaveLength(1);
    expect(newLines[0]).toMatchObject({
      action: "parseReceipt",
      model: "gpt-nope",
      reason: "provider_call_failed",
      message: "model not found: gpt-nope",
    });
  });

  it("maps an authentication error to the auth failure without echoing the key", async () => {
    mockCreate.mockRejectedValue(new MockAuthenticationError("unauthorized"));
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-4o-mini",
      apiKey: "sk-should-never-appear",
    });
    expect(result).toEqual({
      ok: false,
      error: "auth",
      message: expect.stringContaining("rejected"),
    });
    expect(JSON.stringify(result)).not.toContain("sk-should-never-appear");
  });

  it("maps a permission-denied error to the auth failure", async () => {
    mockCreate.mockRejectedValue(new MockPermissionDeniedError("no credit"));
    const result = await parseReceipt({
      imageBase64: "x",
      mimeType: "image/jpeg",
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
      apiKey: "key",
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeout: 30_000 }),
    );
  });
});
