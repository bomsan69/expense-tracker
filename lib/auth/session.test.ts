import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./session";

describe("signSessionToken / verifySessionToken", () => {
  it("round-trips the claims", async () => {
    const token = await signSessionToken({ userId: 42, tokenVersion: 3 });
    const claims = await verifySessionToken(token);
    expect(claims).toEqual({ userId: 42, tokenVersion: 3 });
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken({ userId: 42, tokenVersion: 3 });
    const tampered = token.slice(0, -4) + "abcd";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects garbage input", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  it("rejects an empty string", async () => {
    expect(await verifySessionToken("")).toBeNull();
  });
});
