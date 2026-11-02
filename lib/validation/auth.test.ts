import { describe, expect, it } from "vitest";
import { changePasswordSchema, loginSchema } from "./auth";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(
      loginSchema.safeParse({ email: "user@example.com", password: "secret" })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Enter a valid email address.",
      );
    }
  });

  it("rejects a blank password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Enter your password.");
    }
  });
});

describe("changePasswordSchema", () => {
  const base = {
    currentPassword: "current.pass1",
    newPassword: "new.password1",
    confirmPassword: "new.password1",
  };

  it("accepts a valid change", () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a new password under the policy", () => {
    const result = changePasswordSchema.safeParse({
      ...base,
      newPassword: "short1",
      confirmPassword: "short1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Use at least 10 characters with a letter and a number.",
      );
    }
  });

  it("rejects a new password with no digit", () => {
    const result = changePasswordSchema.safeParse({
      ...base,
      newPassword: "allletters",
      confirmPassword: "allletters",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a mismatched confirmation", () => {
    const result = changePasswordSchema.safeParse({
      ...base,
      confirmPassword: "something.else1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.message === "The passwords do not match.",
        ),
      ).toBe(true);
    }
  });

  it("rejects a new password equal to the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "same.password1",
      newPassword: "same.password1",
      confirmPassword: "same.password1",
    });
    expect(result.success).toBe(false);
  });
});
