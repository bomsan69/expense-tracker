"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
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
  } catch {
    return { ok: false, error: BATCH_FAILURE_ERROR };
  }

  redirect("/");
}
