import { z } from "zod";
import { isValidIsoDate } from "@/lib/dates";
import { parseAmountToMinor } from "@/lib/money";

const AMOUNT_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_AMOUNT_DOLLARS = 1_000_000_000;

export const spentOnSchema = z
  .string()
  .refine((value) => isValidIsoDate(value), { message: "Enter a valid date." });

export const categoryIdSchema = z
  .string()
  .min(1, { message: "Select a category." })
  .refine((value) => /^\d+$/.test(value), { message: "Select a category." })
  .transform((value) => Number(value));

export const merchantSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter a merchant name." })
  .max(160, { message: "Enter a merchant name." });

export const amountSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      AMOUNT_INPUT_PATTERN.test(value) &&
      Number(value) > 0 &&
      Number(value) < MAX_AMOUNT_DOLLARS,
    { message: "Enter an amount greater than 0." },
  )
  .transform((value) => parseAmountToMinor(value));

export const notesSchema = z
  .string()
  .max(500, { message: "Notes must be 500 characters or fewer." })
  .optional();

export const personSchema = z
  .enum(["husband", "wife"], { message: "Select who entered this." })
  .default("husband");

export type Person = z.infer<typeof personSchema>;

/** The list filter's extra "all" option, which is not a storable `person`. */
export const personFilterSchema = z
  .enum(["all", "husband", "wife"])
  .catch("all");

export type PersonFilter = z.infer<typeof personFilterSchema>;

export const expenseInputSchema = z.object({
  spentOn: spentOnSchema,
  categoryId: categoryIdSchema,
  merchant: merchantSchema,
  amountMinor: amountSchema,
  notes: notesSchema,
  person: personSchema,
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const dateRangeSchema = z
  .object({
    from: z
      .string()
      .refine((value) => isValidIsoDate(value), { message: "Enter a valid date." }),
    to: z
      .string()
      .refine((value) => isValidIsoDate(value), { message: "Enter a valid date." }),
  })
  .refine((data) => data.from <= data.to, {
    message: "The start date must be on or before the end date.",
    path: ["to"],
  });

export type DateRangeInput = z.infer<typeof dateRangeSchema>;

export const pageSchema = z.coerce.number().int().min(1).catch(1);
