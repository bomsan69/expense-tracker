import { and, eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { db } from "./index";
import { categories, users } from "./schema";

const SEED_CATEGORIES = ["Food", "Home", "Travel", "Health"];

async function main(): Promise<void> {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_USER_EMAIL and SEED_USER_PASSWORD must be set");
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  let userId: number;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const passwordHash = await hashPassword(password);
    const [result] = await db.insert(users).values({ email, passwordHash });
    userId = result.insertId;
  }

  for (const name of SEED_CATEGORIES) {
    const nameNormalized = name.toLowerCase();
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.nameNormalized, nameNormalized),
        ),
      );
    if (!existingCategory) {
      await db.insert(categories).values({ userId, name, nameNormalized });
    }
  }

  console.log(`Seed complete for ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
