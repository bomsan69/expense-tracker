import { and, eq, gte, lte, sum } from "drizzle-orm";
import { db } from "@/db";
import { categories, expenses } from "@/db/schema";
import { todayIso } from "@/lib/dates";

const MONTHS_IN_CHART = 6;

function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = `${year}-${pad(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { from, to };
}

function monthLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function currentYearMonth(): { year: number; month: number } {
  const [year, month] = todayIso().split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return { year, month };
}

/** Month index relative to year 0, so arithmetic across year boundaries is a plain offset. */
function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

function yearMonthFromIndex(index: number): { year: number; month: number } {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export interface MonthlyTotal {
  year: number;
  month: number;
  label: string;
  totalMinor: number;
}

export async function monthlyTotals(userId: number): Promise<MonthlyTotal[]> {
  const { year: currentYear, month: currentMonth } = currentYearMonth();
  const currentIndex = monthIndex(currentYear, currentMonth);
  const months = Array.from({ length: MONTHS_IN_CHART }, (_, i) =>
    yearMonthFromIndex(currentIndex - (MONTHS_IN_CHART - 1 - i)),
  );

  return Promise.all(
    months.map(async ({ year, month }) => {
      const { from, to } = monthBounds(year, month);
      const [row] = await db
        .select({ value: sum(expenses.amountMinor) })
        .from(expenses)
        .where(
          and(
            eq(expenses.userId, userId),
            gte(expenses.spentOn, from),
            lte(expenses.spentOn, to),
          ),
        );
      return {
        year,
        month,
        label: monthLabel(year, month),
        totalMinor: Number.parseInt(row?.value ?? "0", 10),
      };
    }),
  );
}

export interface CategoryBreakdownItem {
  categoryId: number;
  categoryName: string;
  totalMinor: number;
  percentage: number;
}

function reconcilePercentages(
  items: { categoryId: number; categoryName: string; totalMinor: number }[],
  grandTotal: number,
): CategoryBreakdownItem[] {
  const withRaw = items.map((item) => {
    const raw = (item.totalMinor / grandTotal) * 100;
    return { ...item, raw, floor: Math.floor(raw) };
  });
  const flooredSum = withRaw.reduce((acc, item) => acc + item.floor, 0);
  let remainder = 100 - flooredSum;

  const byRemainderDesc = [...withRaw].sort(
    (a, b) => b.raw - b.floor - (a.raw - a.floor),
  );
  const percentageById = new Map(
    withRaw.map((item) => [item.categoryId, item.floor]),
  );
  for (const item of byRemainderDesc) {
    if (remainder <= 0) break;
    percentageById.set(item.categoryId, (percentageById.get(item.categoryId) ?? 0) + 1);
    remainder -= 1;
  }

  return withRaw.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    totalMinor: item.totalMinor,
    percentage: percentageById.get(item.categoryId) ?? item.floor,
  }));
}

// For the "Last Month by Category" chart's subtitle, e.g. "October 2026".
export function previousCalendarMonthLabel(): string {
  const { year: currentYear, month: currentMonth } = currentYearMonth();
  const { year, month } = yearMonthFromIndex(
    monthIndex(currentYear, currentMonth) - 1,
  );
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export async function categoryBreakdownLastMonth(
  userId: number,
): Promise<CategoryBreakdownItem[]> {
  const { year: currentYear, month: currentMonth } = currentYearMonth();
  const { year, month } = yearMonthFromIndex(
    monthIndex(currentYear, currentMonth) - 1,
  );
  const { from, to } = monthBounds(year, month);

  const rows = await db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      totalMinor: sum(expenses.amountMinor),
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.spentOn, from),
        lte(expenses.spentOn, to),
      ),
    )
    .groupBy(categories.id, categories.name);

  const totals = rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    totalMinor: Number.parseInt(row.totalMinor ?? "0", 10),
  }));

  const grandTotal = totals.reduce((acc, row) => acc + row.totalMinor, 0);
  if (grandTotal === 0) {
    return [];
  }

  return reconcilePercentages(totals, grandTotal);
}
