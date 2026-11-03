"use client";

import { useState } from "react";
import { formatDate } from "@/lib/dates";
import { minorToInputValue, parseAmountToMinor } from "@/lib/money";
import { formatMoney } from "@/lib/money";
import type { ReceiptDraftItem } from "@/lib/receipt-draft";
import type { Category } from "@/lib/queries/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReceiptRowProps {
  item: ReceiptDraftItem;
  categories: Category[];
  error?: string | null;
  onChange: (item: ReceiptDraftItem) => void;
  onRemove: () => void;
}

export function ReceiptRow({
  item,
  categories,
  error,
  onChange,
  onRemove,
}: ReceiptRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item);
  const categoryName =
    categories.find((category) => category.id === item.categoryId)?.name ??
    "Uncategorized";

  if (!isEditing) {
    return (
      <li className="rounded-lg border border-border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">{item.merchant}</p>
            <p className="text-sm text-muted-foreground">
              {categoryName} · {formatDate(item.spentOn)}
            </p>
          </div>
          <p className="shrink-0 font-semibold text-foreground">
            {formatMoney(item.amountMinor)}
          </p>
        </div>
        {item.isDuplicate && (
          <p className="mt-1 text-sm text-muted-foreground">
            Possible duplicate of an existing expense
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-2 flex gap-3 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setDraft(item);
              setIsEditing(true);
            }}
            className="text-accent underline-offset-2 hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-accent underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3">
        <Input
          type="date"
          aria-label="Date"
          value={draft.spentOn}
          onChange={(event) =>
            setDraft({ ...draft, spentOn: event.target.value })
          }
        />
        <Select
          value={draft.categoryId !== null ? String(draft.categoryId) : ""}
          onValueChange={(value) =>
            setDraft({ ...draft, categoryId: Number(value) })
          }
        >
          <SelectTrigger aria-label="Category" className="w-full">
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
        <Input
          aria-label="Item name"
          value={draft.merchant}
          onChange={(event) =>
            setDraft({ ...draft, merchant: event.target.value })
          }
        />
        <Input
          aria-label="Amount"
          inputMode="decimal"
          defaultValue={minorToInputValue(draft.amountMinor)}
          onChange={(event) => {
            try {
              setDraft({
                ...draft,
                amountMinor: parseAmountToMinor(event.target.value),
              });
            } catch {
              // Ignore unparsable input while the user is still typing;
              // the last valid amount is kept until they finish.
            }
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => {
              onChange(draft);
              setIsEditing(false);
            }}
            className="min-h-11 flex-1 rounded-md bg-accent text-white"
          >
            Save
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsEditing(false)}
            className="min-h-11 flex-1 rounded-md"
          >
            Cancel
          </Button>
        </div>
      </div>
    </li>
  );
}
