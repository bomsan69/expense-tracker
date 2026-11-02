"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
}

export function PageHeader({ title, showBack = false }: PageHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <header className="flex min-h-14 items-center gap-2 border-b border-border px-4">
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="-ml-2 flex min-h-11 min-w-11 items-center justify-center"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={2} />
        </button>
      )}
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </header>
  );
}
