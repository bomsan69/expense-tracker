"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import {
  parseReceiptAction,
  type ReceiptItemProposal,
} from "@/app/(app)/expenses/new/actions";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";
import { RECEIPT_DRAFT_KEY, type ReceiptDraft } from "@/lib/receipt-draft";
import type { Category } from "@/lib/queries/categories";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic";

interface ReceiptPickerProps {
  categories: Category[];
}

export function ReceiptPicker({ categories }: ReceiptPickerProps) {
  const router = useRouter();
  // A bare `await parseReceiptAction(...)` call (not routed through a
  // <form action> / useActionState) was unreliable here — the request
  // would intermittently never leave the browser, the same category of
  // issue as the `.bind()` server-action bug found elsewhere in this app.
  // Routing it through a form, as every other mutation in this app does,
  // fixed it.
  const [state, formAction, isPending] = useActionState<
    ActionResult<ReceiptItemProposal[]> | undefined,
    FormData
  >(parseReceiptAction, undefined);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const filenameRef = useRef("");

  const serverError = state && !state.ok ? state.error : undefined;

  useEffect(() => {
    if (!state?.ok) return;
    const defaultCategoryId = categories[0]?.id ?? null;
    const draft: ReceiptDraft = {
      filename: filenameRef.current,
      items: state.data.map((item) => ({
        ...item,
        categoryId: defaultCategoryId,
      })),
    };
    try {
      sessionStorage.setItem(RECEIPT_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // sessionStorage can throw (private browsing, quota) — surfacing it
      // needs a state update; there's no external system to subscribe to
      // instead.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Something went wrong. Please try again.");
      return;
    }
    router.push("/receipt/review");
  }, [state, categories, router]);

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    filenameRef.current = file.name;
    event.target.form?.requestSubmit();
    // Clear it so re-selecting the identical file (e.g. after a failure)
    // still fires a change event next time.
    event.target.value = "";
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs font-semibold tracking-wide text-muted-foreground">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        OR IMPORT A RECEIPT
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      {(error ?? serverError) && (
        <p role="alert" className="text-sm text-destructive">
          {error ?? serverError}
        </p>
      )}

      <form action={formAction}>
        <input
          ref={cameraInputRef}
          type="file"
          name="image"
          accept={ACCEPTED_TYPES}
          capture="environment"
          className="hidden"
          onChange={onInputChange}
        />
      </form>
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

      <form action={formAction}>
        <input
          ref={albumInputRef}
          type="file"
          name="image"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={onInputChange}
        />
      </form>
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
