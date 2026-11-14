"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartTable } from "./chart-table";
import { formatMoney } from "@/lib/money";
import {
  PERSON_BG_CLASSES,
  PERSON_LABELS,
  PERSON_OPTIONS,
  PERSON_FILL_CLASSES,
} from "@/lib/person";
import type { MonthlyTotal } from "@/lib/queries/stats";

interface MonthlySpendingChartProps {
  data: MonthlyTotal[];
}

export function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  const hasSpending = data.some((month) => month.totalMinor > 0);

  if (!hasSpending) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No spending recorded in the last 6 months.
      </p>
    );
  }

  // Stacked rather than side-by-side: at the 390px reference viewport six
  // months of paired bars are too thin to read, and stacking keeps each
  // bar's full height equal to that month's total.
  const chartData = data.map((month) => ({
    label: month.label,
    [PERSON_LABELS.husband]: month.husbandMinor,
    [PERSON_LABELS.wife]: month.wifeMinor,
  }));

  return (
    <div>
      <ul
        data-testid="person-legend"
        className="flex gap-4 text-sm text-muted-foreground"
      >
        {PERSON_OPTIONS.map((person) => (
          <li key={person} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-3 rounded-full ${PERSON_BG_CLASSES[person]}`}
            />
            {PERSON_LABELS[person]}
          </li>
        ))}
      </ul>

      <div className="mt-2 h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              contentStyle={{
                borderRadius: 10,
                borderColor: "var(--border)",
              }}
            />
            <Bar
              dataKey={PERSON_LABELS.husband}
              stackId="person"
              className={PERSON_FILL_CLASSES.husband}
            />
            <Bar
              dataKey={PERSON_LABELS.wife}
              stackId="person"
              radius={[4, 4, 0, 0]}
              className={PERSON_FILL_CLASSES.wife}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Monthly spending by person, the last 6 calendar months"
        columns={["Month", PERSON_LABELS.husband, PERSON_LABELS.wife, "Total"]}
        rows={data.map((month) => [
          month.label,
          formatMoney(month.husbandMinor),
          formatMoney(month.wifeMinor),
          formatMoney(month.totalMinor),
        ])}
      />
    </div>
  );
}
