import { and, count, desc, eq, gte, inArray, lte, sum } from "drizzle-orm";
import { db } from "@/db";
import { categories, expenses } from "@/db/schema";
import type { ExpenseInput } from "@/lib/validation/expense";

export type Expense = typeof expenses.$inferSelect;

export interface ExpenseFilter {
  from: string;
  to: string;
  categoryId?: number;
}

const PAGE_SIZE = 10;

function whereCondition(userId: number, filter: ExpenseFilter) {
  const conditions = [
    eq(expenses.userId, userId),
    gte(expenses.spentOn, filter.from),
    lte(expenses.spentOn, filter.to),
  ];
  if (filter.categoryId !== undefined) {
    conditions.push(eq(expenses.categoryId, filter.categoryId));
  }
  return and(...conditions);
}

async function assertCategoriesOwnedByUser(
  userId: number,
  categoryIds: number[],
): Promise<void> {
  const uniqueIds = [...new Set(categoryIds)];
  if (uniqueIds.length === 0) {
    return;
  }
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(eq(categories.userId, userId), inArray(categories.id, uniqueIds)),
    );
  if (rows.length !== uniqueIds.length) {
    throw new Error("Category not found");
  }
}

export async function listExpenses(
  userId: number,
  filter: ExpenseFilter,
  page: number,
): Promise<Expense[]> {
  return db
    .select()
    .from(expenses)
    .where(whereCondition(userId, filter))
    .orderBy(desc(expenses.spentOn), desc(expenses.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
}

export async function countExpenses(
  userId: number,
  filter: ExpenseFilter,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(expenses)
    .where(whereCondition(userId, filter));
  return row?.value ?? 0;
}

export async function sumExpenses(
  userId: number,
  filter: ExpenseFilter,
): Promise<number> {
  const [row] = await db
    .select({ value: sum(expenses.amountMinor) })
    .from(expenses)
    .where(whereCondition(userId, filter));
  return Number.parseInt(row?.value ?? "0", 10);
}

export async function findDuplicateExpense(
  userId: number,
  spentOn: string,
  merchant: string,
  amountMinor: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.spentOn, spentOn),
        eq(expenses.merchant, merchant),
        eq(expenses.amountMinor, amountMinor),
      ),
    );
  return row !== undefined;
}

export async function getExpenseById(
  userId: number,
  id: number,
): Promise<Expense | null> {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  return row ?? null;
}

export async function createExpense(
  userId: number,
  input: ExpenseInput,
): Promise<Expense> {
  await assertCategoriesOwnedByUser(userId, [input.categoryId]);
  const [result] = await db.insert(expenses).values({
    userId,
    categoryId: input.categoryId,
    spentOn: input.spentOn,
    merchant: input.merchant,
    amountMinor: input.amountMinor,
    notes: input.notes ?? null,
  });
  const created = await getExpenseById(userId, result.insertId);
  if (!created) {
    throw new Error("Failed to load created expense");
  }
  return created;
}

export async function updateExpense(
  userId: number,
  id: number,
  input: ExpenseInput,
): Promise<Expense | null> {
  const existing = await getExpenseById(userId, id);
  if (!existing) {
    return null;
  }
  await assertCategoriesOwnedByUser(userId, [input.categoryId]);
  await db
    .update(expenses)
    .set({
      categoryId: input.categoryId,
      spentOn: input.spentOn,
      merchant: input.merchant,
      amountMinor: input.amountMinor,
      notes: input.notes ?? null,
    })
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  return getExpenseById(userId, id);
}

export async function deleteExpense(
  userId: number,
  id: number,
): Promise<boolean> {
  const [result] = await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  return result.affectedRows > 0;
}

export async function createManyExpenses(
  userId: number,
  inputs: ExpenseInput[],
): Promise<Expense[]> {
  await assertCategoriesOwnedByUser(
    userId,
    inputs.map((input) => input.categoryId),
  );
  return db.transaction(async (tx) => {
    const created: Expense[] = [];
    for (const input of inputs) {
      const [result] = await tx.insert(expenses).values({
        userId,
        categoryId: input.categoryId,
        spentOn: input.spentOn,
        merchant: input.merchant,
        amountMinor: input.amountMinor,
        notes: input.notes ?? null,
      });
      const [row] = await tx
        .select()
        .from(expenses)
        .where(
          and(eq(expenses.id, result.insertId), eq(expenses.userId, userId)),
        );
      if (!row) {
        throw new Error("Failed to load created expense");
      }
      created.push(row);
    }
    return created;
  });
}
