"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";
import { INVALID_CREDENTIALS_ERROR, loginSchema } from "@/lib/validation/auth";

export async function login(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS_ERROR,
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email));

  const valid = user
    ? await verifyPassword(user.passwordHash, parsed.data.password)
    : false;
  if (!user || !valid) {
    return { ok: false, error: INVALID_CREDENTIALS_ERROR };
  }

  await issueSession({ userId: user.id, tokenVersion: user.tokenVersion });
  redirect("/");
}
