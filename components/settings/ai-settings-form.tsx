"use client";

import { useActionState, useState } from "react";
import { saveAiSettingsAction, verifyAiSettingsAction } from "@/app/(app)/settings/actions";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

interface AiSettingsFormProps {
  initialModel: string;
  maskedKey: string | null;
}

export function AiSettingsForm({ initialModel, maskedKey }: AiSettingsFormProps) {
  const [state, formAction, isPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(saveAiSettingsAction, undefined);
  const [verifyState, verifyFormAction, isVerifying] = useActionState<
    ActionResult | undefined,
    FormData
  >(verifyAiSettingsAction, undefined);
  const error = state && !state.ok ? state.error : undefined;
  const success = state?.ok === true;
  const verifyError = verifyState && !verifyState.ok ? verifyState.error : undefined;
  const verifySuccess = verifyState?.ok === true;

  const [model, setModel] = useState(initialModel);
  // Starts blank: blank means "keep the stored key" (SPEC.md §7 SCR-05).
  const [apiKey, setApiKey] = useState("");

  // Clear the typed key out of the DOM once it's been saved, synchronously
  // during render rather than in an effect (react-hooks/set-state-in-effect)
  // — SPEC.md §9 requires the raw key never linger once persisted.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state?.ok) {
      setApiKey("");
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-foreground">
          Settings saved.
        </p>
      )}
      {verifyError && (
        <p role="alert" className="text-sm text-destructive">
          {verifyError}
        </p>
      )}
      {verifySuccess && (
        <p role="status" className="text-sm text-foreground">
          Connection verified.
        </p>
      )}

      <FormField id="aiModel" label="AI Model">
        <Input
          id="aiModel"
          name="aiModel"
          placeholder="Enter model ID"
          value={model}
          onChange={(event) => setModel(event.target.value)}
        />
      </FormField>

      <FormField id="aiApiKey" label="API Key">
        <Input
          id="aiApiKey"
          name="aiApiKey"
          type="password"
          autoComplete="off"
          placeholder={maskedKey ?? "Enter API key"}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </FormField>
      <p className="text-xs text-muted-foreground">
        Your API key is handled securely. Never displayed in application
        logs.
      </p>

      <div className="flex gap-2">
        <Button
          type="submit"
          formAction={verifyFormAction}
          variant="outline"
          disabled={isPending || isVerifying}
          className="min-h-12 flex-1"
        >
          {isVerifying ? "Verifying…" : "Verify"}
        </Button>
        <Button
          type="submit"
          disabled={isPending || isVerifying}
          className="min-h-12 flex-1 rounded-md bg-accent font-semibold text-white"
        >
          {isPending ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
