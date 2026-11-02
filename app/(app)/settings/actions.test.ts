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

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { saveAiSettingsAction, logoutAction } = await import("./actions");

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
      formData({ aiModel: "claude-sonnet-5", aiApiKey: "sk.ant.abcd1234" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });

    const settings = await getUserAiSettings(userId);
    expect(settings?.aiModel).toBe("claude-sonnet-5");
    expect(settings?.aiApiKeyLast4).toBe("1234");
    expect(JSON.stringify(result)).not.toContain("sk.ant.abcd1234");
  });

  it("keeps the stored key when the key field is blank", async () => {
    await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "claude-sonnet-5", aiApiKey: "sk.ant.original.key" }),
    );
    const result = await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "claude-sonnet-5-updated", aiApiKey: "" }),
    );
    expect(result).toEqual({ ok: true, data: undefined });

    const settings = await getUserAiSettings(userId);
    expect(settings?.aiModel).toBe("claude-sonnet-5-updated");
    expect(settings?.aiApiKeyLast4).toBe(".key"); // unchanged: last4 of "...original.key"
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
      formData({ aiModel: "claude-sonnet-5", aiApiKey: "   " }),
    );
    expect(result).toEqual({ ok: false, error: "Enter a valid API key." });
  });

  it("redirects to /login when unauthenticated", async () => {
    cookieJar.jar.delete("session");
    await expect(
      saveAiSettingsAction(
        undefined,
        formData({ aiModel: "claude-sonnet-5", aiApiKey: "" }),
      ),
    ).rejects.toThrow("/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("never touches another user's settings", async () => {
    const other = await createTestUser();
    await saveAiSettingsAction(
      undefined,
      formData({ aiModel: "claude-sonnet-5", aiApiKey: "sk-ant-mine" }),
    );
    const otherSettings = await getUserAiSettings(other.id);
    expect(otherSettings?.aiModel).toBeNull();
    await deleteTestUser(other.id);
  });
});

describe("logoutAction", () => {
  it("clears the session cookie and redirects to /login", async () => {
    await expect(logoutAction()).rejects.toThrow("/login");
    expect(cookieJar.deletes).toContain("session");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});
