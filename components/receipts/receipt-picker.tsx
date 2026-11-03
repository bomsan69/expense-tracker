"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { parseReceiptAction } from "@/app/(app)/expenses/new/actions";
import { Button } from "@/components/ui/button";
import { RECEIPT_DRAFT_KEY, type ReceiptDraft } from "@/lib/receipt-draft";
import type { Category } from "@/lib/queries/categories";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic";

interface ReceiptPickerProps {
  categories: Category[];
}

export function ReceiptPicker({ categories }: ReceiptPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("image", file);
    startTransition(async () => {
      const result = await parseReceiptAction(undefined, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const defaultCategoryId = categories[0]?.id ?? null;
      const draft: ReceiptDraft = {
        filename: file.name,
        items: result.data.map((item) => ({
          ...item,
          categoryId: defaultCategoryId,
        })),
      };
      try {
        sessionStorage.setItem(RECEIPT_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        setError("Something went wrong. Please try again.");
        return;
      }
      router.push("/receipt/review");
    });
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      handleFile(file);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        OR IMPORT A RECEIPT
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() => cameraInputRef.current?.click()}
        className="min-h-12 w-full rounded-md border border-border bg-background font-semibold text-foreground"
      >
        <Camera aria-hidden="true" size={20} />
        {isPending ? "Scanning…" : "Take Photo"}
      </Button>

      <input
        ref={albumInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={onInputChange}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={() => albumInputRef.current?.click()}
        className="min-h-12 w-full rounded-md bg-secondary font-semibold text-foreground"
      >
        <ImagePlus aria-hidden="true" size={20} />
        {isPending ? "Scanning…" : "Choose from Album"}
      </Button>
    </div>
  );
}
