import { PageHeader } from "@/components/app/page-header";

export default function ManageCategoriesPage() {
  return (
    <>
      <PageHeader title="Manage Categories" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          SUP-02 · Manage Categories
        </p>
      </div>
    </>
  );
}
