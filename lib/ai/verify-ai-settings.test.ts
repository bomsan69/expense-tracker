import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRetrieve,
  MockAuthenticationError,
  MockPermissionDeniedError,
  MockNotFoundError,
  MockAPIConnectionTimeoutError,
} = vi.hoisted(() => {
  class MockAuthenticationError extends Error {}
  class MockPermissionDeniedError extends Error {}
  class MockNotFoundError extends Error {}
  class MockAPIConnectionTimeoutError extends Error {}
  return {
    mockRetrieve: vi.fn(),
    MockAuthenticationError,
    MockPermissionDeniedError,
    MockNotFoundError,
    MockAPIConnectionTimeoutError,
  };
});

vi.mock("openai", () => {
  class MockOpenAI {
    static AuthenticationError = MockAuthenticationError;
    static PermissionDeniedError = MockPermissionDeniedError;
    static NotFoundError = MockNotFoundError;
    static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
    models = { retrieve: mockRetrieve };
  }
  return { default: MockOpenAI };
});

const { verifyAiSettings } = await import("./verify-ai-settings");

beforeEach(() => {
  mockRetrieve.mockReset();
});

describe("verifyAiSettings", () => {
  it("succeeds when the model can be retrieved", async () => {
    mockRetrieve.mockResolvedValue({ id: "gpt-4o-mini" });
    const result = await verifyAiSettings({ model: "gpt-4o-mini", apiKey: "key" });
    expect(result).toEqual({ ok: true });
  });

  it("maps an authentication error to the auth failure without echoing the key", async () => {
    mockRetrieve.mockRejectedValue(new MockAuthenticationError("unauthorized"));
    const result = await verifyAiSettings({
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
    mockRetrieve.mockRejectedValue(new MockPermissionDeniedError("no credit"));
    const result = await verifyAiSettings({ model: "gpt-4o-mini", apiKey: "key" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("auth");
  });

  it("maps a not-found error to the not_found failure", async () => {
    mockRetrieve.mockRejectedValue(new MockNotFoundError("no such model"));
    const result = await verifyAiSettings({ model: "no-such-model", apiKey: "key" });
    expect(result).toEqual({
      ok: false,
      error: "not_found",
      message: expect.stringContaining("model"),
    });
  });

  it("maps a timeout error to the timeout failure", async () => {
    mockRetrieve.mockRejectedValue(new MockAPIConnectionTimeoutError("timed out"));
    const result = await verifyAiSettings({ model: "gpt-4o-mini", apiKey: "key" });
    expect(result).toEqual({
      ok: false,
      error: "timeout",
      message: expect.stringContaining("timed out"),
    });
  });

  it("passes a timeout option to the provider call", async () => {
    mockRetrieve.mockResolvedValue({ id: "gpt-4o-mini" });
    await verifyAiSettings({ model: "gpt-4o-mini", apiKey: "key" });
    expect(mockRetrieve).toHaveBeenCalledWith(
      "gpt-4o-mini",
      expect.objectContaining({ timeout: 10_000 }),
    );
  });
});
