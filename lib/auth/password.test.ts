import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("round-trips a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple1");
    await expect(verifyPassword(hash, "correct-horse-battery-staple1")).resolves.toBe(
      true,
    );
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple1");
    await expect(verifyPassword(hash, "wrong-password-123")).resolves.toBe(
      false,
    );
  });

  it("produces an argon2id hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple1");
    expect(hash).toMatch(/^\$argon2id\$/);
  });
});
