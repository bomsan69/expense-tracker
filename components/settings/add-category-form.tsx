"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCategoryAction } from "@/app/(app)/settings/categories/actions";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";
import type { Category } from "@/lib/queries/categories";

export function AddCategoryForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionResult<Category> | undefined,
    FormData
  >(createCategoryAction, undefined);
  const [name, setName] = useState("");
  const error = state && !state.ok ? state.error : undefined;

  // Reset the field synchronously during render on a successful create,
  // rather than in an effect (react-hooks/set-state-in-effect).
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setName("");
    }
  }

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormField id="name" label="New Category Name" required error={error}>
        <Input
          id="name"
          name="name"
          required
          maxLength={64}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!!error}
        />
      </FormField>
      <Button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-md bg-accent font-semibold text-white"
      >
        {isPending ? "Adding…" : "Add Category"}
      </Button>
    </form>
  );
}
