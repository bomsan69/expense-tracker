"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExpenseAction } from "@/app/(app)/expenses/[id]/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteExpenseButtonProps {
  id: number;
}

export function DeleteExpenseButton({ id }: DeleteExpenseButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteExpenseAction(id);
      // On success the action redirects server-side and never returns here.
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 w-full rounded-md border border-red-200 bg-red-50 font-semibold text-destructive hover:bg-red-100"
        >
          <Trash2 aria-hidden="true" size={16} />
          Delete Expense
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete expense?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the expense from your records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="border border-red-200 bg-red-50 text-destructive hover:bg-red-100"
          >
            {isPending ? "Deleting…" : "Delete Expense"}
          </AlertDialogAction>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
