import OpenAI from "openai";

export const VERIFY_TIMEOUT_MS = 10_000;

export type VerifyAiSettingsFailure = "auth" | "not_found" | "timeout" | "unknown";

export type VerifyAiSettingsResult =
  | { ok: true }
  | { ok: false; error: VerifyAiSettingsFailure; message: string };

const FAILURE_MESSAGES: Record<VerifyAiSettingsFailure, string> = {
  auth: "Your AI API key was rejected. Check it in Settings.",
  not_found: "Couldn't find that AI model. Check the model name.",
  timeout: "Verification timed out. Try again.",
  unknown: "Couldn't verify the AI model and API key. Try again.",
};

function failure(error: VerifyAiSettingsFailure): VerifyAiSettingsResult {
  return { ok: false, error, message: FAILURE_MESSAGES[error] };
}

export interface VerifyAiSettingsParams {
  model: string;
  apiKey: string;
}

// Single AI provider: OpenAI only — no provider abstraction layer (SPEC.md §4 D5).
// Retrieving the model is the cheapest call that still confirms both the key
// is valid and the model id is accessible to it.
export async function verifyAiSettings(
  params: VerifyAiSettingsParams,
): Promise<VerifyAiSettingsResult> {
  const client = new OpenAI({ apiKey: params.apiKey });

  try {
    await client.models.retrieve(params.model, { timeout: VERIFY_TIMEOUT_MS });
    return { ok: true };
  } catch (error) {
    if (
      error instanceof OpenAI.AuthenticationError ||
      error instanceof OpenAI.PermissionDeniedError
    ) {
      return failure("auth");
    }
    if (error instanceof OpenAI.NotFoundError) {
      return failure("not_found");
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return failure("timeout");
    }
    return failure("unknown");
  }
}
