"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import {
  SUPPORTED_RECEIPT_MIME_TYPES,
  parseReceipt,
  type ReceiptMimeType,
} from "@/lib/ai/parse-receipt";
import { requireSession } from "@/lib/auth/session";
import { decryptApiKey } from "@/lib/crypto/api-key";
import {
  createExpense,
  findDuplicateExpense,
} from "@/lib/queries/expenses";
import {
  getUserAiSettings,
  getUserApiKeyCiphertext,
} from "@/lib/queries/settings";
import { expenseInputSchema } from "@/lib/validation/expense";

const MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024;
const RECEIPT_FORMAT_ERROR = "Choose a JPEG, PNG, WebP, or HEIC image.";

export async function createExpenseAction(
  _prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSession();

  const parsed = expenseInputSchema.safeParse({
    spentOn: formData.get("spentOn"),
    categoryId: formData.get("categoryId"),
    merchant: formData.get("merchant"),
    amountMinor: formData.get("amountMinor"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Something went wrong. Please try again.",
    };
  }

  await createExpense(session.userId, parsed.data);
  redirect("/");
}

export interface ReceiptItemProposal {
  spentOn: string;
  merchant: string;
  amountMinor: number;
  isDuplicate: boolean;
}

export async function parseReceiptAction(
  _prevState: ActionResult<ReceiptItemProposal[]> | undefined,
  formData: FormData,
): Promise<ActionResult<ReceiptItemProposal[]>> {
  const session = await requireSession();

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return { ok: false, error: RECEIPT_FORMAT_ERROR };
  }
  if (
    !(SUPPORTED_RECEIPT_MIME_TYPES as readonly string[]).includes(file.type)
  ) {
    return { ok: false, error: RECEIPT_FORMAT_ERROR };
  }
  if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
    return { ok: false, error: "Choose an image under 10 MB." };
  }

  const settings = await getUserAiSettings(session.userId);
  const ciphertext = await getUserApiKeyCiphertext(session.userId);
  if (!settings?.aiModel || !ciphertext) {
    return {
      ok: false,
      error: "Add your AI model and API key in Settings before scanning a receipt.",
    };
  }

  const apiKey = decryptApiKey(ciphertext);
  // In memory only (D6): never written to disk or a table.
  const buffer = Buffer.from(await file.arrayBuffer());
  const imageBase64 = buffer.toString("base64");

  const result = await parseReceipt({
    imageBase64,
    mimeType: file.type as ReceiptMimeType,
    model: settings.aiModel,
    apiKey,
  });
  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  const items: ReceiptItemProposal[] = [];
  for (const item of result.items) {
    const isDuplicate = await findDuplicateExpense(
      session.userId,
      item.spentOn,
      item.merchant,
      item.amountMinor,
    );
    items.push({ ...item, isDuplicate });
  }

  return { ok: true, data: items };
}
