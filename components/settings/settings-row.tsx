import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SettingsRowProps {
  label: string;
  href: string;
}

export function SettingsRow({ label, href }: SettingsRowProps) {
  return (
    <Link
      href={href}
      className="flex min-h-12 items-center justify-between border-b border-border py-3 text-foreground"
    >
      {label}
      <ChevronRight
        aria-hidden="true"
        size={20}
        className="text-muted-foreground"
      />
    </Link>
  );
}
