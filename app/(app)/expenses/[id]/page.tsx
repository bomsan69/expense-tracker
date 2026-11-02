import { PageHeader } from "@/components/app/page-header";

export default function ExpenseDetailPage() {
  return (
    <>
      <PageHeader title="Expense Detail" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          SCR-03 · Expense Detail / Edit
        </p>
      </div>
    </>
  );
}
