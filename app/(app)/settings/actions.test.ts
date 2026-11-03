import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signSessionToken } from "@/lib/auth/session";
import { getUserAiSettings } from "@/lib/queries/settings";
import { createTestUser, deleteTestUser } from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";

const cookieJar = createMockCookieJar();
const mockRedirect = vi.fn(createMockRedirect());

const { mockRetrieve, MockAuthenticationError } = vi.hoisted(() => {
  class MockAuthenticationError extends Error {}
  return { mockRetrieve: vi.fn(), MockAuthenticationError };
});

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("openai", () => {
  class MockOpenAI {
    static AuthenticationError = MockAuthenticationError;
    static PermissionDeniedError = class extends Error {};
    static NotFoundError = class extends Error {};
    static APIConnectionTimeoutError = class extends Error {};
    models = { retrieve: mockRetrieve };
  }
  return { default: MockOpenAI };
});

const { saveAiSettingsAction, verifyAiSettingsAction, logoutAction } =
  await import("./actions");

let userId: number;

async function signInAs(id: number, tokenVersion = 0): Promise<void> {
  const token = await signSessionToken({ userId: id, tokenVersion });
  cookieJar.jar.set("session", token);
}

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(async () => {
  mockRedirect.mockClear();
  mockRetrieve.mockReset();
  cookieJar.sets.length = 0;
  cookieJar.deletes.length = 0;
  const user = await createTestUser();
  userId = user.id;
  await signInAs(userId);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("saveAiSettingsAction", () => {
  it("saves the model and encrypted key, masked by last4", async () => {
    const result = await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-abcd1234" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });

    const settings = await getUserAiSettings(userId);
    expect(settings?.aiModel).toBe("gpt-4o-mini");
    expect(settings?.aiApiKeyLast4).toBe("1234");
    expect(JSON.stringify(result)).not.toContain("sk-abcd1234");
  });

  it("keeps the stored key when the key field is blank", async () => {
    await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-original-key" }),
    );
    const result = await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini-updated", aiApiKey: "" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });

    const settings = await getUserAiSettings(userId);
    expect(settings?.aiModel).toBe("gpt-4o-mini-updated");
    expect(settings?.aiApiKeyLast4).toBe("-key"); // unchanged: last4 of "...original-key"
  });

  it("rejects a blank model", async () => {
    const result = await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "", aiApiKey: "" }),
    );
    expect(result).toEqual({ ok: false, error: "Enter an AI model name." });
  });

  it("rejects a whitespace-only key", async () => {
    const result = await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "   " }),
    );
    expect(result).toEqual({ ok: false, error: "Enter a valid API key." });
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      saveAiSettingsAction(
        undefined,
        formData({ aiModel: "gpt-4o-mini", aiApiKey: "" }),
      ),
    ).rejects.toThrow("/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("never touches another user's settings", async () => {
    const other = await createTestUser();
    await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-mine" }),
    );
    const otherSettings = await getUserAiSettings(other.id);
    expect(otherSettings?.aiModel).toBeNull();
    await deleteTestUser(other.id);
  });
});

describe("verifyAiSettingsAction", () => {
  it("succeeds when the provider accepts the typed model and key", async () => {
    mockRetrieve.mockResolvedValue({ id: "gpt-4o-mini" });
    const result = await verifyAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-typed-key" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });
    expect(mockRetrieve).toHaveBeenCalledWith(
      "gpt-4o-mini",
      expect.anything(),
    );
  });

  it("does not persist anything, even on success", async () => {
    mockRetrieve.mockResolvedValue({ id: "gpt-4o-mini" });
    await verifyAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-typed-key" }),
    );
    const settings = await getUserAiSettings(userId);
    expect(settings?.aiModel).toBeNull();
  });

  it("surfaces a rejected key without echoing it", async () => {
    mockRetrieve.mockRejectedValue(new MockAuthenticationError("unauthorized"));
    const result = await verifyAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-should-never-appear" }),
    );
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("rejected"),
    });
    expect(JSON.stringify(result)).not.toContain("sk-should-never-appear");
  });

  it("falls back to the stored key when the key field is left blank", async () => {
    mockRetrieve.mockResolvedValue({ id: "gpt-4o-mini" });
    await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-stored-key" }),
    );
    const result = await verifyAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });
  });

  it("rejects verifying with no key typed and none stored", async () => {
    const result = await verifyAiSettingsAction(
      undefined,
      formData({ aiModel: "gpt-4o-mini", aiApiKey: "" }),
    );
    expect(result).toEqual({ ok: false, error: "Enter an API key to verify." });
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      verifyAiSettingsAction(
        undefined,
        formData({ aiModel: "gpt-4o-mini", aiApiKey: "sk-key" }),
      ),
    ).rejects.toThrow("/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

describe("logoutAction", () => {
  it("clears the session cookie and redirects to /login", async () => {
    await expect(logoutAction()).rejects.toThrow("/login");
    expect(cookieJar.deletes).toContain("session");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});
