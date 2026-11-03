"use client";

import { useActionState, useState } from "react";
import { Wallet } from "lucide-react";
import { login } from "@/app/(auth)/login/actions";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(login, undefined);
  const error = state && !state.ok ? state.error : undefined;

  // Controlled, not uncontrolled: React resets a <form action={fn}> after
  // submission, which would otherwise discard the user's input on failure
  // (SPEC.md §6.6 "form data is preserved on failure").
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex w-full max-w-sm flex-col items-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
        <Wallet
          aria-hidden="true"
          size={28}
          className="text-primary-foreground"
        />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-foreground">
        Expense Tracker
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track spending. Understand habits.
      </p>

      <form action={formAction} className="mt-8 flex w-full flex-col gap-4">
        <FormField id="email" label="Email" required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "password-error" : undefined}
          />
        </FormField>

        <FormField id="password" label="Password" required error={error}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "password-error" : undefined}
          />
        </FormField>

        <Button
          type="submit"
          disabled={isPending}
          className="min-h-12 w-full rounded-md bg-accent font-semibold text-white"
        >
          {isPending ? "Signing In…" : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
