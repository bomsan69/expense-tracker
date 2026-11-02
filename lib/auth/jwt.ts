import { SignJWT, jwtVerify } from "jose";

// Edge-safe: no DB import here. middleware.ts runs on the Edge runtime and
// must not pull in the mysql2-backed db client transitively (SPEC.md §9.2 —
// this file is only ever the lightweight, redirect-level signature check).

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export interface SessionClaims {
  userId: number;
  tokenVersion: number;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ userId: claims.userId, tokenVersion: claims.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { userId, tokenVersion } = payload;
    if (typeof userId !== "number" || typeof tokenVersion !== "number") {
      return null;
    }
    return { userId, tokenVersion };
  } catch {
    return null;
  }
}
