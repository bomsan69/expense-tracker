import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export interface UserAiSettings {
  aiModel: string | null;
  aiApiKeyLast4: string | null;
}

export async function getUserAiSettings(
  userId: number,
): Promise<UserAiSettings | null> {
  const [row] = await db
    .select({ aiModel: users.aiModel, aiApiKeyLast4: users.aiApiKeyLast4 })
    .from(users)
    .where(eq(users.id, userId));
  return row ?? null;
}

export async function getUserApiKeyCiphertext(
  userId: number,
): Promise<string | null> {
  const [row] = await db
    .select({ ciphertext: users.aiApiKeyCiphertext })
    .from(users)
    .where(eq(users.id, userId));
  return row?.ciphertext ?? null;
}

export interface SaveAiSettingsParams {
  aiModel: string;
  aiApiKeyCiphertext?: string;
  aiApiKeyLast4?: string;
}

export async function saveAiSettings(
  userId: number,
  params: SaveAiSettingsParams,
): Promise<void> {
  const set: Partial<typeof users.$inferInsert> = { aiModel: params.aiModel };
  if (params.aiApiKeyCiphertext !== undefined) {
    set.aiApiKeyCiphertext = params.aiApiKeyCiphertext;
    set.aiApiKeyLast4 = params.aiApiKeyLast4 ?? null;
  }
  await db.update(users).set(set).where(eq(users.id, userId));
}
