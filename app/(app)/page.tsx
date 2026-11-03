import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseRow } from "@/components/expenses/expense-row";
import { Pagination } from "@/components/expenses/pagination";
import { SpendingSummary } from "@/components/expenses/spending-summary";
import { requireSession } from "@/lib/auth/session";
import { defaultDateRange } from "@/lib/dates";
import { listCategories } from "@/lib/queries/categories";
import { getHomeData, type HomeDataParams } from "./actions";

interface HomePageProps {
  searchParams: Promise<HomeDataParams>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const session = await requireSession();
  const [result, categories] = await Promise.all([
    getHomeData(params),
    listCategories(session.userId),
  ]);

  const defaults = defaultDateRange();
  const from = result.ok ? result.data.from : (params.from ?? defaults.from);
  const to = result.ok ? result.data.to : (params.to ?? defaults.to);
  const categoryId = result.ok
    ? (result.data.categoryId?.toString() ?? "all")
    : (params.category ?? "all");

  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return (
    <>
      <PageHeader title="Home" />
      <div className="flex-1 px-4 py-6">
        <SpendingSummary
          totalMinor={result.ok ? result.data.totalMinor : 0}
          from={from}
          to={to}
        />

        <ExpenseFilters
          from={from}
          to={to}
          categoryId={categoryId}
          categories={categories}
          error={result.ok ? undefined : result.error}
        />

        {result.ok && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">Expenses</h2>
            {result.data.items.length === 0 ? (
              <EmptyState
                icon={SearchX}
                message="No expenses found. Try changing your date range or category."
              />
            ) : (
              <ul className="mt-2">
                {result.data.items.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    categoryName={
                      categoryNameById.get(expense.categoryId) ?? "Unknown"
                    }
                  />
                ))}
              </ul>
            )}
            <Pagination
              page={result.data.page}
              totalPages={result.data.totalPages}
              basePath="/"
              from={result.data.from}
              to={result.data.to}
              category={categoryId}
            />
          </section>
        )}
      </div>
    </>
  );
}
