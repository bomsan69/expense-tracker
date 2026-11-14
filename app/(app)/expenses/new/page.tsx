import { PageHeader } from "@/components/app/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ReceiptPicker } from "@/components/receipts/receipt-picker";
import { requireSession } from "@/lib/auth/session";
import { todayIso } from "@/lib/dates";
import { listCategories } from "@/lib/queries/categories";
import { createExpenseAction } from "./actions";

export default async function AddExpensePage() {
  const session = await requireSession();
  const categories = await listCategories(session.userId);

  return (
    <>
      <PageHeader title="Add Expense" showBack />
      <div className="flex-1 px-4 py-6">
        <ExpenseForm
          action={createExpenseAction}
          categories={categories}
          submitLabel="Save Expense"
          defaultValues={{
            spentOn: todayIso(),
            categoryId: null,
            merchant: "",
            amountMinor: null,
            notes: "",
            person: "husband",
          }}
        />
        <ReceiptPicker categories={categories} />
      </div>
    </>
  );
}
