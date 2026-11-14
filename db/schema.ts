import {
  bigint,
  char,
  date,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true })
    .autoincrement()
    .primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  tokenVersion: int("token_version", { unsigned: true })
    .notNull()
    .default(0),
  aiModel: varchar("ai_model", { length: 128 }),
  aiApiKeyCiphertext: text("ai_api_key_ciphertext"),
  aiApiKeyLast4: char("ai_api_key_last4", { length: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const categories = mysqlTable(
  "categories",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("categories_user_id_name_normalized_unique").on(
      table.userId,
      table.nameNormalized,
    ),
    index("categories_user_id_name_idx").on(table.userId, table.name),
  ],
);

export const expenses = mysqlTable(
  "expenses",
  {
    id: bigint("id", { mode: "number", unsigned: true })
      .autoincrement()
      .primaryKey(),
    userId: bigint("user_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: bigint("category_id", { mode: "number", unsigned: true })
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    spentOn: date("spent_on", { mode: "string" }).notNull(),
    merchant: varchar("merchant", { length: 160 }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    notes: varchar("notes", { length: 500 }),
    person: mysqlEnum("person", ["husband", "wife"])
      .notNull()
      .default("husband"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("expenses_user_id_spent_on_idx").on(table.userId, table.spentOn),
    index("expenses_user_id_category_id_spent_on_idx").on(
      table.userId,
      table.categoryId,
      table.spentOn,
    ),
  ],
);
