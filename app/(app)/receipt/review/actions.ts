"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { logError } from "@/lib/logging/error-log";
import { createManyExpenses } from "@/lib/queries/expenses";
import { expenseInputSchema } from "@/lib/validation/expense";

const BATCH_FAILURE_ERROR =
  "Nothing was saved. Fix the highlighted rows and try again.";

export interface ReceiptRowInput {
  spentOn: string;
  categoryId: string;
  merchant: string;
  amountMinor: string;
  notes?: string;
  person?: string;
}

export type SaveBatchResult =
  | { ok: true }
  | { ok: false; error: string; rowErrors?: (string | null)[] };

export async function saveBatchAction(
  rows: ReceiptRowInput[],
): Promise<SaveBatchResult> {
  const session = await requireSession();

  if (rows.length === 0) {
    return { ok: false, error: BATCH_FAILURE_ERROR };
  }

  const parsedRows = rows.map((row) => expenseInputSchema.safeParse(row));
  const rowErrors = parsedRows.map((parsed) =>
    parsed.success ? null : parsed.error.issues[0]?.message ?? "Invalid row.",
  );
  if (rowErrors.some((error) => error !== null)) {
    return { ok: false, error: BATCH_FAILURE_ERROR, rowErrors };
  }

  const validInputs = parsedRows.flatMap((parsed) =>
    parsed.success ? [parsed.data] : [],
  );

  try {
    await createManyExpenses(session.userId, validInputs);
  } catch (error) {
    // Unlike the row-validation rejections above, this is an unexpected
    // failure (e.g. a DB-level error) — the user only ever sees the generic
    // message below, so without this it would vanish with no diagnostic
    // trail at all.
    logError(error, { action: "saveBatchAction", userId: session.userId });
    return { ok: false, error: BATCH_FAILURE_ERROR };
  }

  redirect("/");
}
