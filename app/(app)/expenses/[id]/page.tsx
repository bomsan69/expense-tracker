import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { listCategories } from "@/lib/queries/categories";
import { getExpenseAction, updateExpenseAction } from "./actions";

interface ExpenseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({
  params,
}: ExpenseDetailPageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const session = await requireSession();
  const [result, categories] = await Promise.all([
    Number.isInteger(id)
      ? getExpenseAction(id)
      : Promise.resolve({ ok: false as const, error: "Expense not found." }),
    listCategories(session.userId),
  ]);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Expense Detail" showBack />
        <div className="flex-1 px-4 py-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            Expense not found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            It may have been deleted, or it doesn&apos;t belong to your account.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </>
    );
  }

  const expense = result.data;
  const boundUpdate = updateExpenseAction.bind(null, expense.id);

  return (
    <>
      <PageHeader title="Expense Detail" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="mb-4 rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
          Editing expense · {formatDate(expense.spentOn)}
        </p>

        <ExpenseForm
          action={boundUpdate}
          categories={categories}
          submitLabel="Save Changes"
          showDirtyIndicator
          defaultValues={{
            spentOn: expense.spentOn,
            categoryId: expense.categoryId,
            merchant: expense.merchant,
            amountMinor: expense.amountMinor,
            notes: expense.notes ?? "",
          }}
        />

        <div className="mt-4">
          <DeleteExpenseButton id={expense.id} />
        </div>
      </div>
    </>
  );
}
