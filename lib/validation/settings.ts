import { z } from "zod";

export const aiModelSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter an AI model name." })
  .max(128, { message: "Enter an AI model name." });

// Blank means "keep the stored key" (handled by the caller); whitespace-only
// input is rejected so it can't masquerade as either a key or a blank.
export const aiApiKeySchema = z.string().refine(
  (value) => value === "" || value.trim().length > 0,
  { message: "Enter a valid API key." },
);

export const aiSettingsSchema = z.object({
  aiModel: aiModelSchema,
  aiApiKey: aiApiKeySchema,
});

export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
