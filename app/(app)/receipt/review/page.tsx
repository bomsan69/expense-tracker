import { PageHeader } from "@/components/app/page-header";
import { ReceiptReviewClient } from "@/components/receipts/receipt-review-client";
import { requireSession } from "@/lib/auth/session";
import { listCategories } from "@/lib/queries/categories";

export default async function ReceiptReviewPage() {
  const session = await requireSession();
  const categories = await listCategories(session.userId);

  return (
    <>
      <PageHeader title="Receipt Review" showBack />
      <div className="flex-1 px-4 py-6">
        <ReceiptReviewClient categories={categories} />
      </div>
    </>
  );
}
