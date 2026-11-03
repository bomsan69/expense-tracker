"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "cn";
import { ChartTable } from "./chart-table";
import { formatMoney } from "@/lib/money";
import type { CategoryBreakdownItem } from "@/lib/queries/stats";

const SLICE_FILL_CLASSES = [
  "fill-accent",
  "fill-primary",
  "fill-muted-foreground",
  "fill-accent/50",
  "fill-primary/50",
  "fill-muted-foreground/50",
];

function sliceFillClass(index: number): string {
  return SLICE_FILL_CLASSES[index % SLICE_FILL_CLASSES.length] ?? "fill-accent";
}

interface CategoryBreakdownChartProps {
  data: CategoryBreakdownItem[];
  monthLabel: string;
}

export function CategoryBreakdownChart({
  data,
  monthLabel,
}: CategoryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No expenses recorded for {monthLabel}.
      </p>
    );
  }

  return (
    <div>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalMinor"
              nameKey="categoryName"
              innerRadius="55%"
              outerRadius="90%"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.categoryId}
                  className={sliceFillClass(index)}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(_value, name, item) => [
                `${(item.payload as CategoryBreakdownItem).percentage}%`,
                name,
              ]}
              contentStyle={{ borderRadius: 10, borderColor: "var(--border)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
        {data.map((item, index) => (
          <li key={item.categoryId} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "h-3 w-3 rounded-full",
                sliceFillClass(index).replace("fill-", "bg-"),
              )}
            />
            <span className="text-foreground">
              {item.categoryName} {item.percentage}%
            </span>
          </li>
        ))}
      </ul>

      <ChartTable
        caption={`Category breakdown for ${monthLabel}`}
        columns={["Category", "Amount", "Percentage"]}
        rows={data.map((item) => [
          item.categoryName,
          formatMoney(item.totalMinor),
          `${item.percentage}%`,
        ])}
      />
    </div>
  );
}
