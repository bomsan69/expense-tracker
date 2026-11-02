import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "@/lib/auth/jwt";

// Duplicated from lib/auth/session.ts's sessionCookieOptions() rather than
// imported: that module also imports the DB client, which must never be
// pulled into this Edge-runtime bundle (SPEC.md §9.2).
function middlewareCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const claims = token ? await verifySessionToken(token) : null;
  const isLoginPath = request.nextUrl.pathname === "/login";

  if (!claims && !isLoginPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (claims && isLoginPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  if (claims) {
    // Refreshed on each authenticated request (D1); the DB token_version
    // check still happens per-action in getSession(), not here.
    const refreshed = await signSessionToken(claims);
    response.cookies.set(SESSION_COOKIE_NAME, refreshed, middlewareCookieOptions());
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
