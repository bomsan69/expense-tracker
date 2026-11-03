import Link from "next/link";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Expense } from "@/lib/queries/expenses";

interface ExpenseRowProps {
  expense: Expense;
  categoryName: string;
}

export function ExpenseRow({ expense, categoryName }: ExpenseRowProps) {
  return (
    <li className="flex min-h-16 items-center justify-between gap-4 border-b border-border py-4">
      <div className="min-w-0">
        <Link
          href={`/expenses/${expense.id}`}
          className="font-semibold text-foreground underline-offset-2 hover:underline focus-visible:underline"
        >
          {expense.merchant}
        </Link>
        <p className="text-sm text-muted-foreground">
          {categoryName} · {formatDate(expense.spentOn)}
        </p>
      </div>
      <span className="shrink-0 font-semibold text-foreground">
        {formatMoney(expense.amountMinor)}
      </span>
    </li>
  );
}
