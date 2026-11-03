"use client";

import { usePathname, useRouter } from "next/navigation";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/queries/categories";

const ALL_CATEGORIES = "all";

interface ExpenseFiltersProps {
  from: string;
  to: string;
  categoryId: string;
  categories: Category[];
  error?: string;
}

export function ExpenseFilters({
  from,
  to,
  categoryId,
  categories,
  error,
}: ExpenseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: { from: string; to: string; category: string }) {
    const params = new URLSearchParams({
      from: next.from,
      to: next.to,
      category: next.category,
    });
    // Any filter change resets to page 1 (SPEC.md §7 SCR-02).
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <FormField id="from" label="From">
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(event) =>
            navigate({ from: event.target.value, to, category: categoryId })
          }
          aria-invalid={!!error}
          aria-describedby={error ? "to-error" : undefined}
        />
      </FormField>

      <FormField id="to" label="To" error={error}>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(event) =>
            navigate({ from, to: event.target.value, category: categoryId })
          }
          aria-invalid={!!error}
          aria-describedby={error ? "to-error" : undefined}
        />
      </FormField>

      <FormField id="category" label="Category">
        <Select
          value={categoryId}
          onValueChange={(value) => navigate({ from, to, category: value })}
        >
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
