import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses, users } from "@/db/schema";

export async function createTestUser(): Promise<{ id: number; email: string }> {
  const email = `test-${randomUUID()}@example.com`;
  const [result] = await db
    .insert(users)
    .values({ email, passwordHash: "unused-in-tests" });
  return { id: result.insertId, email };
}

export async function deleteTestUser(id: number): Promise<void> {
  // Delete expenses first: a single cascading `DELETE users` does not
  // guarantee expenses are removed before categories, and category_id is
  // ON DELETE RESTRICT (SPEC.md §5), so that ordering can fail otherwise.
  await db.delete(expenses).where(eq(expenses.userId, id));
  await db.delete(users).where(eq(users.id, id));
}
