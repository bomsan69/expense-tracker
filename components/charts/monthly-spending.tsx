"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ChartTable } from "./chart-table";
import { formatMoney } from "@/lib/money";
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

  const chartData = data.map((month, index) => ({
    label: month.label,
    amount: month.totalMinor,
    isCurrent: index === data.length - 1,
  }));

  return (
    <div>
      <div className="h-64" aria-hidden="true">
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
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.label}
                  className={entry.isCurrent ? "fill-accent" : "fill-accent/25"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption="Monthly spending, the last 6 calendar months"
        columns={["Month", "Total"]}
        rows={data.map((month) => [month.label, formatMoney(month.totalMinor)])}
      />
    </div>
  );
}
