"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBatchAction } from "@/app/(app)/receipt/review/actions";
import { ReceiptRow } from "@/components/receipts/receipt-row";
import { Button } from "@/components/ui/button";
import { formatMoney, minorToInputValue } from "@/lib/money";
import type { Category } from "@/lib/queries/categories";
import { RECEIPT_DRAFT_KEY, type ReceiptDraftItem } from "@/lib/receipt-draft";

interface ReceiptReviewClientProps {
  categories: Category[];
}

function clearDraft() {
  try {
    sessionStorage.removeItem(RECEIPT_DRAFT_KEY);
  } catch {
    // sessionStorage may be unavailable (private mode); nothing to clean up.
  }
}

type LoadedDraft =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; filename: string; items: ReceiptDraftItem[] };

// sessionStorage only exists client-side (D10), so it can only be read
// inside an effect — never during the initial (possibly server) render.
function readDraft(): LoadedDraft {
  try {
    const raw = sessionStorage.getItem(RECEIPT_DRAFT_KEY);
    if (!raw) {
      return { status: "missing" };
    }
    const parsed = JSON.parse(raw) as {
      filename: string;
      items: ReceiptDraftItem[];
    };
    return { status: "ready", filename: parsed.filename, items: parsed.items };
  } catch {
    return { status: "missing" };
  }
}

export function ReceiptReviewClient({ categories }: ReceiptReviewClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<LoadedDraft>({ status: "loading" });
  const [items, setItems] = useState<ReceiptDraftItem[]>([]);
  const [rowErrors, setRowErrors] = useState<(string | null)[] | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = readDraft();
    // sessionStorage can only be read client-side (D10); this mount-only
    // sync from that external store is exactly what the lint rule's own
    // description permits ("calling setState ... when external state
    // changes"), not the derived-state-from-props case it targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loaded);
    if (loaded.status === "ready") {
      setItems(loaded.items);
    }
  }, []);

  useEffect(() => {
    if (draft.status === "missing") {
      router.replace("/expenses/new");
    }
  }, [draft, router]);

  if (draft.status !== "ready") {
    return null;
  }
  const filename = draft.filename;

  const total = items.reduce((sum, item) => sum + item.amountMinor, 0);

  function handleConfirm() {
    setFormError(null);
    setRowErrors(null);
    startTransition(async () => {
      const rows = items.map((item) => ({
        spentOn: item.spentOn,
        categoryId: item.categoryId !== null ? String(item.categoryId) : "",
        merchant: item.merchant,
        amountMinor: minorToInputValue(item.amountMinor),
      }));
      const result = await saveBatchAction(rows);
      // On success the action redirects server-side and never returns here.
      if (result && !result.ok) {
        setFormError(result.error);
        setRowErrors(result.rowErrors ?? null);
        return;
      }
      clearDraft();
    });
  }

  function handleCancel() {
    clearDraft();
    router.push("/expenses/new");
  }

  return (
    <div>
      <p className="rounded-md bg-secondary px-3 py-2 text-sm text-muted-foreground">
        {filename} · {items.length} extracted item{items.length === 1 ? "" : "s"}
      </p>

      <h2 className="mt-4 text-lg font-semibold text-foreground">
        Review expenses before saving
      </h2>

      {formError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {items.map((item, index) => (
          <ReceiptRow
            key={index}
            item={item}
            categories={categories}
            error={rowErrors?.[index] ?? null}
            onChange={(updated) =>
              setItems((prev) =>
                prev.map((it, i) => (i === index ? updated : it)),
              )
            }
            onRemove={() => {
              setItems((prev) => prev.filter((_, i) => i !== index));
              setRowErrors(null);
            }}
          />
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-border p-4">
        <span className="font-semibold text-foreground">
          Total · {items.length} items
        </span>
        <span className="font-semibold text-foreground">
          {formatMoney(total)}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Button
          type="button"
          disabled={items.length === 0 || isPending}
          onClick={handleConfirm}
          className="min-h-12 w-full rounded-md bg-accent font-semibold text-white"
        >
          {isPending ? "Saving…" : "Confirm & Save All"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={handleCancel}
          className="min-h-12 w-full rounded-md"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
