"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { issueSession, requireSession } from "@/lib/auth/session";
import {
  WRONG_CURRENT_PASSWORD_ERROR,
  changePasswordSchema,
} from "@/lib/validation/auth";

export async function changePasswordAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? WRONG_CURRENT_PASSWORD_ERROR,
    };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId));
  if (!user) {
    return { ok: false, error: WRONG_CURRENT_PASSWORD_ERROR };
  }

  const validCurrent = await verifyPassword(
    user.passwordHash,
    parsed.data.currentPassword,
  );
  if (!validCurrent) {
    return { ok: false, error: WRONG_CURRENT_PASSWORD_ERROR };
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);
  const newTokenVersion = user.tokenVersion + 1;
  await db
    .update(users)
    .set({ passwordHash: newPasswordHash, tokenVersion: newTokenVersion })
    .where(eq(users.id, user.id));

  // Invalidates every other session (D9); re-issue this device's cookie
  // with the new token_version so the current device stays logged in.
  await issueSession({ userId: user.id, tokenVersion: newTokenVersion });

  return { ok: true, data: undefined };
}
