import type { Person } from "@/lib/validation/expense";

export const PERSON_OPTIONS: readonly Person[] = ["husband", "wife"];

export const PERSON_LABELS: Record<Person, string> = {
  husband: "Husband",
  wife: "Wife",
};

// Tailwind only sees literal class names, so the person tokens are spelled
// out here rather than built from the value at runtime.
export const PERSON_TEXT_CLASSES: Record<Person, string> = {
  husband: "text-person-husband",
  wife: "text-person-wife",
};

export const PERSON_FILL_CLASSES: Record<Person, string> = {
  husband: "fill-person-husband",
  wife: "fill-person-wife",
};

export const PERSON_BG_CLASSES: Record<Person, string> = {
  husband: "bg-person-husband",
  wife: "bg-person-wife",
};
