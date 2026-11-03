"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
      className="min-h-12 w-full rounded-md border border-border bg-background font-semibold text-foreground"
    >
      {isPending ? "Logging Out…" : "Log Out"}
    </Button>
  );
}
