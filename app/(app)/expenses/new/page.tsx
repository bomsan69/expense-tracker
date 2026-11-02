import { PageHeader } from "@/components/app/page-header";

export default function AddExpensePage() {
  return (
    <>
      <PageHeader title="Add Expense" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">SCR-04 · Add Expense</p>
      </div>
    </>
  );
}
