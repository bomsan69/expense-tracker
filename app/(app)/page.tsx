import { PageHeader } from "@/components/app/page-header";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Home" />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          SCR-02 · Home / Expense List
        </p>
      </div>
    </>
  );
}
