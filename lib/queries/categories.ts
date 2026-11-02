import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type Category = typeof categories.$inferSelect;

export async function listCategories(userId: number): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.nameNormalized));
}

export async function getCategoryById(
  userId: number,
  id: number,
): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return row ?? null;
}

export type CreateCategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: "duplicate" };

export async function createCategory(
  userId: number,
  name: string,
): Promise<CreateCategoryResult> {
  const nameNormalized = name.trim().toLowerCase();
  const duplicate = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.nameNormalized, nameNormalized),
      ),
    );
  if (duplicate.length > 0) {
    return { ok: false, error: "duplicate" };
  }

  const [result] = await db
    .insert(categories)
    .values({ userId, name, nameNormalized });
  const category = await getCategoryById(userId, result.insertId);
  if (!category) {
    throw new Error("Failed to load created category");
  }
  return { ok: true, category };
}

export type RenameCategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: "duplicate" | "not_found" };

export async function renameCategory(
  userId: number,
  id: number,
  name: string,
): Promise<RenameCategoryResult> {
  const existing = await getCategoryById(userId, id);
  if (!existing) {
    return { ok: false, error: "not_found" };
  }

  const nameNormalized = name.trim().toLowerCase();
  const duplicate = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.nameNormalized, nameNormalized),
      ),
    );
  if (duplicate.some((row) => row.id !== id)) {
    return { ok: false, error: "duplicate" };
  }

  await db
    .update(categories)
    .set({ name, nameNormalized })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  const updated = await getCategoryById(userId, id);
  if (!updated) {
    throw new Error("Failed to load renamed category");
  }
  return { ok: true, category: updated };
}
