"use server";

import { requireSession } from "@/lib/auth/session";
import { defaultDateRange } from "@/lib/dates";
import { type Category, listCategories } from "@/lib/queries/categories";
import {
  type Expense,
  type PersonTotals,
  countExpenses,
  listExpenses,
  sumExpenses,
  sumExpensesByPerson,
} from "@/lib/queries/expenses";
import {
  dateRangeSchema,
  pageSchema,
  personFilterSchema,
  type PersonFilter,
} from "@/lib/validation/expense";

const PAGE_SIZE = 10;

export interface HomeDataParams {
  from?: string;
  to?: string;
  category?: string;
  person?: string;
  page?: string;
}

export interface HomeData {
  items: Expense[];
  totalMinor: number;
  page: number;
  totalPages: number;
  from: string;
  to: string;
  categoryId: number | null;
  person: PersonFilter;
  personTotals: PersonTotals;
  categories: Category[];
}

export type HomeDataResult =
  | { ok: true; data: HomeData }
  | { ok: false; error: string };

export async function getHomeData(
  params: HomeDataParams,
): Promise<HomeDataResult> {
  const session = await requireSession();
  const defaults = defaultDateRange();

  const rangeResult = dateRangeSchema.safeParse({
    from: params.from ?? defaults.from,
    to: params.to ?? defaults.to,
  });
  if (!rangeResult.success) {
    return {
      ok: false,
      error:
        rangeResult.error.issues[0]?.message ??
        "The start date must be on or before the end date.",
    };
  }

  const categories = await listCategories(session.userId);
  let categoryId: number | null = null;
  if (params.category && params.category !== "all") {
    const parsedCategoryId = Number(params.category);
    // A stale or foreign category id falls back to "All" rather than
    // leaking whether some other category id exists (SPEC.md §9.3).
    if (categories.some((category) => category.id === parsedCategoryId)) {
      categoryId = parsedCategoryId;
    }
  }

  const person = personFilterSchema.parse(params.person);

  const filter = {
    from: rangeResult.data.from,
    to: rangeResult.data.to,
    ...(categoryId !== null ? { categoryId } : {}),
    ...(person !== "all" ? { person } : {}),
  };

  const totalCount = await countExpenses(session.userId, filter);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const requestedPage = pageSchema.parse(params.page ?? "1");
  const page = Math.min(requestedPage, totalPages);

  const [items, totalMinor, personTotals] = await Promise.all([
    listExpenses(session.userId, filter, page),
    sumExpenses(session.userId, filter),
    // Split over the identical condition, so the two halves always
    // reconcile against the total beside them (D11).
    sumExpensesByPerson(session.userId, filter),
  ]);

  return {
    ok: true,
    data: {
      items,
      totalMinor,
      page,
      totalPages,
      from: filter.from,
      to: filter.to,
      categoryId,
      person,
      personTotals,
      categories,
    },
  };
}
