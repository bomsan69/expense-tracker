"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth/session";
import {
  deleteExpense,
  getExpenseById,
  updateExpense,
  type Expense,
} from "@/lib/queries/expenses";
import { expenseInputSchema } from "@/lib/validation/expense";

const NOT_FOUND_ERROR = "Expense not found.";

export async function getExpenseAction(
  id: number,
): Promise<ActionResult<Expense>> {
  const session = await requireSession();
  const expense = await getExpenseById(session.userId, id);
  if (!expense) {
    return { ok: false, error: NOT_FOUND_ERROR };
  }
  return { ok: true, data: expense };
}

export async function updateExpenseAction(
  _prevState: ActionResult<Expense> | undefined,
  formData: FormData,
): Promise<ActionResult<Expense>> {
  const session = await requireSession();
  const id = Number(formData.get("id"));

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

  const updated = await updateExpense(session.userId, id, parsed.data);
  if (!updated) {
    return { ok: false, error: NOT_FOUND_ERROR };
  }
  // Save: validate → update → return to SCR-02 with refreshed total and
  // list (SPEC.md §7 SCR-03).
  redirect("/");
}

export async function deleteExpenseAction(id: number): Promise<ActionResult> {
  const session = await requireSession();
  const deleted = await deleteExpense(session.userId, id);
  if (!deleted) {
    return { ok: false, error: NOT_FOUND_ERROR };
  }
  redirect("/");
}
