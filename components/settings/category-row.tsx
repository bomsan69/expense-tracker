"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { renameCategoryAction } from "@/app/(app)/settings/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";
import type { Category } from "@/lib/queries/categories";

interface CategoryRowProps {
  category: Category;
}

export function CategoryRow({ category }: CategoryRowProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState<
    ActionResult<Category> | undefined,
    FormData
  >(renameCategoryAction, undefined);
  const displayName = state?.ok ? state.data.name : category.name;
  const [name, setName] = useState(displayName);
  const error = state && !state.ok ? state.error : undefined;

  // Close edit mode synchronously during render on a successful rename,
  // rather than in an effect (react-hooks/set-state-in-effect).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setIsEditing(false);
    }
  }

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  if (!isEditing) {
    return (
      <li className="flex min-h-12 items-center justify-between border-b border-border py-4">
        <span className="text-foreground">{displayName}</span>
        <button
          type="button"
          onClick={() => {
            setName(displayName);
            setIsEditing(true);
          }}
          className="text-sm font-semibold text-accent underline-offset-2 hover:underline"
        >
          Edit
        </button>
      </li>
    );
  }

  return (
    <li className="border-b border-border py-4">
      <form action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={category.id} />
        <label htmlFor={`category-${category.id}`} className="sr-only">
          Category name
        </label>
        <div className="flex items-center gap-2">
          <Input
            id={`category-${category.id}`}
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={
              error ? `category-${category.id}-error` : undefined
            }
            autoFocus
          />
          <Button
            type="submit"
            disabled={isPending}
            className="min-h-11 rounded-md bg-accent text-white"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 rounded-md"
            onClick={() => {
              setIsEditing(false);
              setName(displayName);
            }}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p
            id={`category-${category.id}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </form>
    </li>
  );
}
