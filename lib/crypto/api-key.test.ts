import { describe, expect, it } from "vitest";
import { decryptApiKey, encryptApiKey, last4 } from "./api-key";

describe("api key encryption", () => {
  it("round-trips the plaintext", () => {
    const ciphertext = encryptApiKey("sk-ant-super-secret-key-1234");
    expect(decryptApiKey(ciphertext)).toBe("sk-ant-super-secret-key-1234");
  });

  it("stores the ciphertext as base64(iv).base64(tag).base64(ct)", () => {
    const ciphertext = encryptApiKey("sk-ant-super-secret-key-1234");
    const parts = ciphertext.split(".");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(() => Buffer.from(part, "base64")).not.toThrow();
    }
  });

  it("produces a different ciphertext for the same plaintext each time", () => {
    const first = encryptApiKey("sk-ant-super-secret-key-1234");
    const second = encryptApiKey("sk-ant-super-secret-key-1234");
    expect(first).not.toBe(second);
  });

  it("rejects a tampered ciphertext", () => {
    const ciphertext = encryptApiKey("sk-ant-super-secret-key-1234");
    const [iv, tag, ct] = ciphertext.split(".") as [string, string, string];
    const tampered = `${iv}.${tag}.${ct.slice(0, -4)}${ct.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}`;
    expect(() => decryptApiKey(tampered)).toThrow();
  });
});

describe("last4", () => {
  it("returns the final 4 characters", () => {
    expect(last4("sk-ant-super-secret-key-1234")).toBe("1234");
  });
});
