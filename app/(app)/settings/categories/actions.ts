"use server";

import type { ActionResult } from "@/lib/action-result";
import { requireSession } from "@/lib/auth/session";
import {
  createCategory,
  renameCategory,
  type Category,
} from "@/lib/queries/categories";
import {
  DUPLICATE_CATEGORY_NAME_ERROR,
  categoryNameSchema,
} from "@/lib/validation/category";

export async function createCategoryAction(
  _prevState: ActionResult<Category> | undefined,
  formData: FormData,
): Promise<ActionResult<Category>> {
  const session = await requireSession();

  const parsed = categoryNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a category name.",
    };
  }

  const result = await createCategory(session.userId, parsed.data);
  if (!result.ok) {
    return { ok: false, error: DUPLICATE_CATEGORY_NAME_ERROR };
  }
  return { ok: true, data: result.category };
}

export async function renameCategoryAction(
  id: number,
  _prevState: ActionResult<Category> | undefined,
  formData: FormData,
): Promise<ActionResult<Category>> {
  const session = await requireSession();

  const parsed = categoryNameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a category name.",
    };
  }

  const result = await renameCategory(session.userId, id, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "duplicate"
          ? DUPLICATE_CATEGORY_NAME_ERROR
          : "This category could not be found.",
    };
  }
  return { ok: true, data: result.category };
}
