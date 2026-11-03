import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../db/schema";
import { encryptApiKey } from "../../lib/crypto/api-key";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional when the environment already has these variables.
}

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL is not set");
}
const pool = mysql.createPool(url);
const db = drizzle(pool, { schema, mode: "default" });

export async function getSeedUserId(email: string): Promise<number> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (!user) {
    throw new Error("Seed user not found");
  }
  return user.id;
}

export async function getFirstCategoryId(userId: number): Promise<number> {
  const [category] = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId));
  if (!category) {
    throw new Error("No category found for seed user");
  }
  return category.id;
}

export async function getCategoryIdByName(
  userId: number,
  name: string,
): Promise<number> {
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId));
  const category = rows.find((row) => row.name === name);
  if (!category) {
    throw new Error(`No category named "${name}" found for seed user`);
  }
  return category.id;
}

export async function createExpensesDirect(
  userId: number,
  categoryId: number,
  rows: { spentOn: string; merchant: string; amountMinor: number }[],
): Promise<void> {
  for (const row of rows) {
    await db.insert(schema.expenses).values({ userId, categoryId, ...row });
  }
}

export async function deleteAllExpenses(userId: number): Promise<void> {
  await db.delete(schema.expenses).where(eq(schema.expenses.userId, userId));
}

export async function deleteExpensesByMerchantPrefix(
  userId: number,
  prefix: string,
): Promise<void> {
  const rows = await db
    .select()
    .from(schema.expenses)
    .where(eq(schema.expenses.userId, userId));
  for (const row of rows.filter((r) => r.merchant.startsWith(prefix))) {
    await db.delete(schema.expenses).where(eq(schema.expenses.id, row.id));
  }
}

export async function setAiSettingsDirect(
  userId: number,
  model: string,
  apiKey: string,
): Promise<void> {
  await db
    .update(schema.users)
    .set({
      aiModel: model,
      aiApiKeyCiphertext: encryptApiKey(apiKey),
      aiApiKeyLast4: apiKey.slice(-4),
    })
    .where(eq(schema.users.id, userId));
}

export async function clearAiSettingsDirect(userId: number): Promise<void> {
  await db
    .update(schema.users)
    .set({ aiModel: null, aiApiKeyCiphertext: null, aiApiKeyLast4: null })
    .where(eq(schema.users.id, userId));
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
