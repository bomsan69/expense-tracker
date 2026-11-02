import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session";
import {
  createTestUserWithPassword,
  deleteTestUser,
} from "@/lib/queries/test-helpers";
import {
  createMockCookieJar,
  createMockRedirect,
} from "@/lib/test-support/next-mocks";

const cookieJar = createMockCookieJar();
const mockRedirect = createMockRedirect();

vi.mock("next/headers", () => ({
  cookies: async () => cookieJar.jar,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

const { changePasswordAction } = await import("./actions");

const CURRENT_PASSWORD = "current.password1";
let userId: number;
let originalToken: string;

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(async () => {
  cookieJar.sets.length = 0;
  const user = await createTestUserWithPassword(CURRENT_PASSWORD);
  userId = user.id;
  originalToken = await signSessionToken({ userId, tokenVersion: 0 });
  cookieJar.jar.set("session", originalToken);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("changePasswordAction", () => {
  it("rejects the wrong current password", async () => {
    const result = await changePasswordAction(
      undefined,
      formData({
        currentPassword: "not.the.password",
        newPassword: "new.password123",
        confirmPassword: "new.password123",
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Your current password is incorrect.",
    });
  });

  it("rejects a new password that fails the policy", async () => {
    const result = await changePasswordAction(
      undefined,
      formData({
        currentPassword: CURRENT_PASSWORD,
        newPassword: "short1",
        confirmPassword: "short1",
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Use at least 10 characters with a letter and a number.",
    });
  });

  it("rejects a mismatched confirmation", async () => {
    const result = await changePasswordAction(
      undefined,
      formData({
        currentPassword: CURRENT_PASSWORD,
        newPassword: "new.password123",
        confirmPassword: "something.else123",
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "The passwords do not match.",
    });
  });

  it("succeeds, re-issues the cookie, and invalidates other sessions", async () => {
    const result = await changePasswordAction(
      undefined,
      formData({
        currentPassword: CURRENT_PASSWORD,
        newPassword: "new.password123",
        confirmPassword: "new.password123",
      }),
    );
    expect(result).toEqual({ ok: true, data: undefined });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user?.tokenVersion).toBe(1);

    // This device's new cookie carries the new token_version.
    const newToken = cookieJar.sets.at(-1)?.value as string;
    const newClaims = await verifySessionToken(newToken);
    expect(newClaims?.tokenVersion).toBe(1);

    // The device's original cookie's claims no longer match the DB, so any
    // other session holding it is invalidated (D9).
    const oldClaims = await verifySessionToken(originalToken);
    expect(oldClaims?.tokenVersion).not.toBe(user?.tokenVersion);
  });

  it("the new password logs in and the old one no longer does", async () => {
    await changePasswordAction(
      undefined,
      formData({
        currentPassword: CURRENT_PASSWORD,
        newPassword: "new.password123",
        confirmPassword: "new.password123",
      }),
    );
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const { verifyPassword } = await import("@/lib/auth/password");
    expect(await verifyPassword(user!.passwordHash, "new.password123")).toBe(
      true,
    );
    expect(await verifyPassword(user!.passwordHash, CURRENT_PASSWORD)).toBe(
      false,
    );
  });
});
