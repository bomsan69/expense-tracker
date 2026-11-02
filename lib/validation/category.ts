import { z } from "zod";

export const DUPLICATE_CATEGORY_NAME_ERROR =
  "A category with this name already exists.";

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter a category name." })
  .max(64, { message: "Enter a category name." });

export type CategoryNameInput = z.infer<typeof categoryNameSchema>;
