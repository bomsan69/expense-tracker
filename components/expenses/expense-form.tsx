"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-result";
import { minorToInputValue } from "@/lib/money";
import type { Category } from "@/lib/queries/categories";

export interface ExpenseFormValues {
  spentOn: string;
  categoryId: number | null;
  merchant: string;
  amountMinor: number | null;
  notes: string;
}

// Generic over the action's success payload (undefined for create, Expense
// for update) — this component only ever reads `ok`/`error`, never `data`.
export interface ExpenseFormProps<T> {
  action: (
    prevState: ActionResult<T> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<T>>;
  categories: Category[];
  defaultValues: ExpenseFormValues;
  submitLabel: string;
  onDirtyChange?: (dirty: boolean) => void;
  showDirtyIndicator?: boolean;
  /** Present for edit (SCR-03); the action reads it via a hidden field
   * rather than via `.bind()`, which does not resolve reliably when the
   * action is passed as a prop into this client component. */
  id?: number;
}

export function ExpenseForm<T>({
  action,
  categories,
  defaultValues,
  submitLabel,
  onDirtyChange,
  showDirtyIndicator = false,
  id,
}: ExpenseFormProps<T>) {
  const [state, formAction, isPending] = useActionState<
    ActionResult<T> | undefined,
    FormData
  >(action, undefined);
  const error = state && !state.ok ? state.error : undefined;

  const [isDirty, setIsDirty] = useState(false);
  const [spentOn, setSpentOn] = useState(defaultValues.spentOn);
  const [categoryId, setCategoryId] = useState(
    defaultValues.categoryId !== null ? String(defaultValues.categoryId) : "",
  );
  const [merchant, setMerchant] = useState(defaultValues.merchant);
  const [amount, setAmount] = useState(
    defaultValues.amountMinor !== null
      ? minorToInputValue(defaultValues.amountMinor)
      : "",
  );
  const [notes, setNotes] = useState(defaultValues.notes);

  function markDirty() {
    setIsDirty(true);
    onDirtyChange?.(true);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {id !== undefined && <input type="hidden" name="id" value={id} />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {showDirtyIndicator && isDirty && !error && (
        <p className="text-sm text-muted-foreground">Unsaved changes</p>
      )}

      <FormField id="spentOn" label="Date" required>
        <Input
          id="spentOn"
          name="spentOn"
          type="date"
          required
          value={spentOn}
          onChange={(event) => {
            setSpentOn(event.target.value);
            markDirty();
          }}
        />
      </FormField>

      <FormField id="categoryId" label="Category" required>
        <Select
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value);
            markDirty();
          }}
        >
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="categoryId" value={categoryId} />
      </FormField>

      <FormField id="merchant" label="Merchant" required>
        <Input
          id="merchant"
          name="merchant"
          required
          maxLength={160}
          value={merchant}
          onChange={(event) => {
            setMerchant(event.target.value);
            markDirty();
          }}
        />
      </FormField>

      <FormField id="amountMinor" label="Amount (USD)" required>
        <Input
          id="amountMinor"
          name="amountMinor"
          inputMode="decimal"
          placeholder="0.00"
          required
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            markDirty();
          }}
        />
      </FormField>

      <FormField id="notes" label="Notes (optional)">
        <Input
          id="notes"
          name="notes"
          maxLength={500}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            markDirty();
          }}
        />
      </FormField>

      <Button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-md bg-accent font-semibold text-white"
      >
        {isPending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
