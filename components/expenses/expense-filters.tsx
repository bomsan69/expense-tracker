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
import { PERSON_LABELS, PERSON_OPTIONS } from "@/lib/person";
import type { Category } from "@/lib/queries/categories";
import type { PersonFilter } from "@/lib/validation/expense";

const ALL_CATEGORIES = "all";
const EVERYONE = "all";

interface ExpenseFiltersProps {
  from: string;
  to: string;
  categoryId: string;
  person: PersonFilter;
  categories: Category[];
  error?: string;
}

export function ExpenseFilters({
  from,
  to,
  categoryId,
  person,
  categories,
  error,
}: ExpenseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(next: {
    from: string;
    to: string;
    category: string;
    person: string;
  }) {
    const params = new URLSearchParams({
      from: next.from,
      to: next.to,
      category: next.category,
      person: next.person,
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
            navigate({
              from: event.target.value,
              to,
              category: categoryId,
              person,
            })
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
            navigate({
              from,
              to: event.target.value,
              category: categoryId,
              person,
            })
          }
          aria-invalid={!!error}
          aria-describedby={error ? "to-error" : undefined}
        />
      </FormField>

      <FormField id="category" label="Category">
        <Select
          value={categoryId}
          onValueChange={(value) =>
            navigate({ from, to, category: value, person })
          }
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

      <FormField id="person" label="Entered by">
        <Select
          value={person}
          onValueChange={(value) =>
            navigate({ from, to, category: categoryId, person: value })
          }
        >
          <SelectTrigger id="person" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EVERYONE}>Everyone</SelectItem>
            {PERSON_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {PERSON_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </div>
  );
}
