import { describe, expect, it } from "vitest";
import { aiApiKeySchema, aiModelSchema, aiSettingsSchema } from "./settings";

describe("aiModelSchema", () => {
  it("accepts a valid model string", () => {
    expect(aiModelSchema.safeParse("claude-sonnet-5").success).toBe(true);
  });

  it("rejects a blank model", () => {
    const result = aiModelSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Enter an AI model name.",
      );
    }
  });
});

describe("aiApiKeySchema", () => {
  it("accepts a blank value (keep stored key)", () => {
    expect(aiApiKeySchema.safeParse("").success).toBe(true);
  });

  it("accepts a real key", () => {
    expect(aiApiKeySchema.safeParse("sk-ant-real-key").success).toBe(true);
  });

  it("rejects a whitespace-only value", () => {
    const result = aiApiKeySchema.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Enter a valid API key.",
      );
    }
  });
});

describe("aiSettingsSchema", () => {
  it("accepts a model with a blank key", () => {
    expect(
      aiSettingsSchema.safeParse({ aiModel: "claude-sonnet-5", aiApiKey: "" })
        .success,
    ).toBe(true);
  });
});
