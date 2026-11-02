import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { isValidIsoDate } from "@/lib/dates";
import { parseAmountToMinor } from "@/lib/money";

export const RECEIPT_TIMEOUT_MS = 30_000;

export const SUPPORTED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;
export type ReceiptMimeType = (typeof SUPPORTED_RECEIPT_MIME_TYPES)[number];

export interface ParsedReceiptItem {
  spentOn: string;
  merchant: string;
  amountMinor: number;
}

export type ParseReceiptFailure =
  | "unsupported_format"
  | "timeout"
  | "auth"
  | "no_items";

export type ParseReceiptResult =
  | { ok: true; items: ParsedReceiptItem[] }
  | { ok: false; error: ParseReceiptFailure; message: string };

const FAILURE_MESSAGES: Record<ParseReceiptFailure, string> = {
  unsupported_format:
    "HEIC images can't be scanned automatically. Try a JPEG, PNG, or WebP image, or enter the expense manually.",
  timeout: "Receipt scanning timed out. Try again or enter the expense manually.",
  auth: "Your AI API key was rejected. Check it in Settings.",
  no_items: "No expense items were found on this receipt. Enter the expense manually.",
};

function failure(error: ParseReceiptFailure): ParseReceiptResult {
  return { ok: false, error, message: FAILURE_MESSAGES[error] };
}

const RECEIPT_PROMPT = `You are reading a photo of a retail receipt. List every purchased line item.
Exclude tax, tip, subtotal, and total lines entirely — they are not line items.
Respond with only JSON, no prose, in this exact shape:
{"items": [{"date": "YYYY-MM-DD", "merchant": "string", "amount": "12.99"}]}
Use the receipt's own date for every item. "merchant" is the store name on the receipt.
"amount" is the line item's price as a decimal string with at most 2 decimal places.
If you cannot find any purchased line items, respond with {"items": []}.`;

const receiptResponseSchema = z.object({
  items: z.array(
    z.object({
      date: z.string(),
      merchant: z.string(),
      amount: z.string(),
    }),
  ),
});

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export interface ParseReceiptParams {
  imageBase64: string;
  mimeType: ReceiptMimeType;
  model: string;
  apiKey: string;
}

export async function parseReceipt(
  params: ParseReceiptParams,
): Promise<ParseReceiptResult> {
  // The Anthropic vision API itself only accepts jpeg/png/webp; HEIC passes
  // our own upload validation (SPEC.md §8.1) but can't be sent to the provider.
  if (params.mimeType === "image/heic") {
    return failure("unsupported_format");
  }

  const client = new Anthropic({ apiKey: params.apiKey });

  let responseText: string;
  try {
    const response = await client.messages.create(
      {
        model: params.model,
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: params.mimeType,
                  data: params.imageBase64,
                },
              },
              { type: "text", text: RECEIPT_PROMPT },
            ],
          },
        ],
      },
      { timeout: RECEIPT_TIMEOUT_MS },
    );
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return failure("no_items");
    }
    responseText = textBlock.text;
  } catch (error) {
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError
    ) {
      return failure("auth");
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return failure("timeout");
    }
    return failure("no_items");
  }

  const json = extractJsonObject(responseText);
  const parsed = receiptResponseSchema.safeParse(json);
  if (!parsed.success) {
    return failure("no_items");
  }

  const items: ParsedReceiptItem[] = [];
  for (const item of parsed.data.items) {
    const merchant = item.merchant.trim();
    if (!merchant || !isValidIsoDate(item.date)) {
      continue;
    }
    try {
      const amountMinor = parseAmountToMinor(item.amount);
      if (amountMinor > 0) {
        items.push({ spentOn: item.date, merchant, amountMinor });
      }
    } catch {
      continue;
    }
  }

  if (items.length === 0) {
    return failure("no_items");
  }
  return { ok: true, items };
}
