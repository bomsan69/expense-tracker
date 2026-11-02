import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createTestUserWithPassword,
  deleteTestUser,
} from "@/lib/queries/test-helpers";
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

const { login } = await import("./actions");

const PASSWORD = "correct.password1";
let userId: number;
let email: string;

beforeEach(async () => {
  cookieJar.sets.length = 0;
  mockRedirect.mockClear();
  const user = await createTestUserWithPassword(PASSWORD);
  userId = user.id;
  email = user.email;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

describe("login", () => {
  it("issues a session cookie and redirects on success", async () => {
    await expect(
      login(undefined, formData({ email, password: PASSWORD })),
    ).rejects.toThrow("/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(cookieJar.sets).toHaveLength(1);
    expect(cookieJar.sets[0]?.name).toBe("session");
    expect(cookieJar.sets[0]?.options).toMatchObject({ httpOnly: true });
  });

  it("rejects a wrong password with the generic message", async () => {
    const result = await login(
      undefined,
      formData({ email, password: "wrong.password1" }),
    );
    expect(result).toEqual({ ok: false, error: "Invalid email or password." });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("rejects an unknown email with the same generic message", async () => {
    const result = await login(
      undefined,
      formData({ email: "nobody@example.com", password: PASSWORD }),
    );
    expect(result).toEqual({ ok: false, error: "Invalid email or password." });
  });

  it("rejects a malformed email with the field-level message", async () => {
    const result = await login(
      undefined,
      formData({ email: "not-an-email", password: PASSWORD }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Enter a valid email address.",
    });
  });

  it("rejects a blank password", async () => {
    const result = await login(undefined, formData({ email, password: "" }));
    expect(result).toEqual({ ok: false, error: "Enter your password." });
  });

  it("never returns the password hash", async () => {
    const result = await login(
      undefined,
      formData({ email, password: "wrong.password1" }),
    );
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(JSON.stringify(result)).not.toContain(user?.passwordHash);
  });
});
