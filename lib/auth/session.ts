import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  type SessionClaims,
  signSessionToken,
  verifySessionToken,
} from "./jwt";

export type { SessionClaims };
export { SESSION_COOKIE_NAME, signSessionToken, verifySessionToken };

// `secure` is relaxed outside production so local dev and the Playwright
// suite (both plain HTTP) can actually store and send the cookie.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export async function issueSession(claims: SessionClaims): Promise<void> {
  const token = await signSessionToken(claims);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// The full check: signature plus the DB's token_version (D1/§9.1). This is
// the actual authorization boundary; middleware only does the redirect-level
// signature check and is never sufficient on its own (SPEC.md §9.2).
export async function getSession(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const claims = await verifySessionToken(token);
  if (!claims) {
    return null;
  }
  const [user] = await db
    .select({ tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.id, claims.userId));
  if (!user || user.tokenVersion !== claims.tokenVersion) {
    return null;
  }
  return claims;
}

// Every server action calls this independently (SPEC.md §9.2) — middleware
// redirecting first is a UX nicety, never the actual authorization boundary.
export async function requireSession(): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
