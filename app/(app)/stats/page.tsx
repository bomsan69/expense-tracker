import { PageHeader } from "@/components/app/page-header";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown";
import { MonthlySpendingChart } from "@/components/charts/monthly-spending";
import { requireSession } from "@/lib/auth/session";
import {
  categoryBreakdownLastMonth,
  monthlyTotals,
  previousCalendarMonthLabel,
} from "@/lib/queries/stats";

export default async function StatsPage() {
  const session = await requireSession();
  const [monthly, breakdown] = await Promise.all([
    monthlyTotals(session.userId),
    categoryBreakdownLastMonth(session.userId),
  ]);
  const monthLabel = previousCalendarMonthLabel();

  return (
    <>
      <PageHeader title="Statistics" showBack />
      <div className="flex-1 px-4 py-6">
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">
            Monthly Spending
          </h2>
          <p className="text-sm text-muted-foreground">
            Last 6 calendar months · USD
          </p>
          <div className="mt-4">
            <MonthlySpendingChart data={monthly} />
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">
            Last Month by Category
          </h2>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
          <div className="mt-4">
            <CategoryBreakdownChart data={breakdown} monthLabel={monthLabel} />
          </div>
        </section>
      </div>
    </>
  );
}
