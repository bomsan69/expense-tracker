import { PageHeader } from "@/components/app/page-header";

export default function ReceiptReviewPage() {
  return (
    <>
      <PageHeader title="Receipt Review" showBack />
      <div className="flex-1 px-4 py-6">
        <p className="text-sm text-muted-foreground">
          SUP-01 · Receipt Review
        </p>
      </div>
    </>
  );
}
