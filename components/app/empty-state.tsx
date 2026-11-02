import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Icon
        aria-hidden="true"
        size={24}
        strokeWidth={2}
        className="text-muted-foreground"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
