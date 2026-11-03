"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/app/(app)/settings/password/actions";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

const SUCCESS_REDIRECT_DELAY_MS = 1200;

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    ActionResult | undefined,
    FormData
  >(changePasswordAction, undefined);
  const error = state && !state.ok ? state.error : undefined;
  const success = state?.ok === true;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!success) {
      return;
    }
    const timer = setTimeout(() => {
      router.push("/settings");
    }, SUCCESS_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [success, router]);

  if (success) {
    return (
      <p role="status" className="text-sm font-medium text-foreground">
        Password updated. Returning to Settings…
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Update the password you use to sign in.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <FormField id="currentPassword" label="Current Password" required>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </FormField>

      <FormField id="newPassword" label="New Password" required>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use at least 10 characters with a letter and a number.
        </p>
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm New Password"
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </FormField>

      <Button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-md bg-accent font-semibold text-white"
      >
        {isPending ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}
