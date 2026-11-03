"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { verifyAiSettings } from "@/lib/ai/verify-ai-settings";
import { clearSession, requireSession } from "@/lib/auth/session";
import { decryptApiKey, encryptApiKey, last4 } from "@/lib/crypto/api-key";
import { getUserApiKeyCiphertext, saveAiSettings } from "@/lib/queries/settings";
import { aiSettingsSchema } from "@/lib/validation/settings";

export async function saveAiSettingsAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = aiSettingsSchema.safeParse({
    aiModel: formData.get("aiModel"),
    aiApiKey: formData.get("aiApiKey"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid API key.",
    };
  }

  const trimmedKey = parsed.data.aiApiKey.trim();
  if (trimmedKey === "") {
    await saveAiSettings(session.userId, { aiModel: parsed.data.aiModel });
  } else {
    await saveAiSettings(session.userId, {
      aiModel: parsed.data.aiModel,
      aiApiKeyCiphertext: encryptApiKey(trimmedKey),
      aiApiKeyLast4: last4(trimmedKey),
    });
  }

  return { ok: true, data: undefined };
}

// Read-only: checks the model + key against the provider without saving
// anything, so a failed check never clobbers the stored settings.
export async function verifyAiSettingsAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = aiSettingsSchema.safeParse({
    aiModel: formData.get("aiModel"),
    aiApiKey: formData.get("aiApiKey"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid API key.",
    };
  }

  const trimmedKey = parsed.data.aiApiKey.trim();
  let apiKey: string;
  if (trimmedKey === "") {
    const ciphertext = await getUserApiKeyCiphertext(session.userId);
    if (!ciphertext) {
      return { ok: false, error: "Enter an API key to verify." };
    }
    apiKey = decryptApiKey(ciphertext);
  } else {
    apiKey = trimmedKey;
  }

  const result = await verifyAiSettings({ model: parsed.data.aiModel, apiKey });
  if (!result.ok) {
    return { ok: false, error: result.message };
  }
  return { ok: true, data: undefined };
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
