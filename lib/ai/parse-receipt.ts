import OpenAI from "openai";
import { z } from "zod";
import { isValidIsoDate, todayIso } from "@/lib/dates";
import { logError } from "@/lib/logging/error-log";
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

const RECEIPT_PROMPT = `You are reading a photo or screenshot of a purchase record. It may be a
retail receipt (list every purchased line item) or a card/bank transaction history (list every
separate transaction). Exclude tax, tip, subtotal, and total lines entirely — they are not
purchases.
Respond with only JSON, no prose, in this exact shape:
{"items": [{"date": "YYYY-MM-DD", "merchant": "string", "amount": "12.99"}]}
Use each entry's own date: the receipt's date for every line item on a single receipt, or each
transaction's own date on a transaction history. "merchant" is that entry's own name as
printed: on a receipt, the purchased item's name or description (e.g. "Milk", "Coffee"), not
the store's name, since repeating the store name on every row is not useful; on a transaction
history, the transaction's own merchant or payee name.
"amount" is that entry's price as a decimal string with at most 2 decimal places.
If you cannot find any purchases or transactions, respond with {"items": []}.`;

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

// Single AI provider: OpenAI only — no provider abstraction layer (SPEC.md §4 D5).
export async function parseReceipt(
  params: ParseReceiptParams,
): Promise<ParseReceiptResult> {
  // The OpenAI vision API itself only accepts jpeg/png/webp; HEIC passes
  // our own upload validation (SPEC.md §8.1) but can't be sent to the provider.
  if (params.mimeType === "image/heic") {
    return failure("unsupported_format");
  }

  const client = new OpenAI({ apiKey: params.apiKey });

  let responseText: string;
  try {
    const response = await client.chat.completions.create(
      {
        model: params.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: RECEIPT_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${params.mimeType};base64,${params.imageBase64}`,
                },
              },
            ],
          },
        ],
      },
      { timeout: RECEIPT_TIMEOUT_MS },
    );
    const content = response.choices[0]?.message.content;
    if (!content) {
      logError("AI provider returned an empty response", {
        action: "parseReceipt",
        model: params.model,
        reason: "empty_response",
      });
      return failure("no_items");
    }
    responseText = content;
  } catch (error) {
    if (
      error instanceof OpenAI.AuthenticationError ||
      error instanceof OpenAI.PermissionDeniedError
    ) {
      return failure("auth");
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return failure("timeout");
    }
    // Anything else (rate limit, model-not-found, a provider-side 500, …)
    // was previously indistinguishable from the model genuinely finding
    // nothing — log the real cause here instead of silently relabeling it.
    logError(error, {
      action: "parseReceipt",
      model: params.model,
      reason: "provider_call_failed",
    });
    return failure("no_items");
  }

  const json = extractJsonObject(responseText);
  const parsed = receiptResponseSchema.safeParse(json);
  if (!parsed.success) {
    logError("AI response was not the expected JSON shape", {
      action: "parseReceipt",
      model: params.model,
      reason: "unparseable_response",
      responseText,
    });
    return failure("no_items");
  }

  const items: ParsedReceiptItem[] = [];
  for (const item of parsed.data.items) {
    const merchant = item.merchant.trim();
    if (!merchant) {
      continue;
    }
    // Some models leave "date" blank or return something unparseable rather
    // than the receipt's own date — fall back to today rather than dropping
    // an otherwise-good item (merchant + amount) that the user can still
    // correct on the review screen.
    const spentOn = isValidIsoDate(item.date) ? item.date : todayIso();
    try {
      const amountMinor = parseAmountToMinor(item.amount);
      if (amountMinor > 0) {
        items.push({ spentOn, merchant, amountMinor });
      }
    } catch {
      continue;
    }
  }

  if (items.length === 0) {
    logError("AI response parsed but yielded no usable items", {
      action: "parseReceipt",
      model: params.model,
      reason: "zero_items",
      rawItemCount: parsed.data.items.length,
      responseText,
    });
    return failure("no_items");
  }
  return { ok: true, items };
}
