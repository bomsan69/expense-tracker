import Link from "next/link";
import { cn } from "cn";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PERSON_LABELS, PERSON_TEXT_CLASSES } from "@/lib/person";
import type { Expense } from "@/lib/queries/expenses";

interface ExpenseRowProps {
  expense: Expense;
  categoryName: string;
}

export function ExpenseRow({ expense, categoryName }: ExpenseRowProps) {
  const personClass = PERSON_TEXT_CLASSES[expense.person];

  return (
    <li className="flex min-h-16 items-center justify-between gap-4 border-b border-border py-4">
      <div className="min-w-0">
        <Link
          href={`/expenses/${expense.id}`}
          className={cn(
            "font-semibold underline-offset-2 hover:underline focus-visible:underline",
            personClass,
          )}
        >
          {expense.merchant}
        </Link>
        <p className="text-sm text-muted-foreground">
          {categoryName} · {formatDate(expense.spentOn)} ·{" "}
          <span className={personClass}>{PERSON_LABELS[expense.person]}</span>
        </p>
      </div>
      <span className={cn("shrink-0 font-semibold", personClass)}>
        {formatMoney(expense.amountMinor)}
      </span>
    </li>
  );
}
