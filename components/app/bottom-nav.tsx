"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, CirclePlus, ChartNoAxesColumn, Settings } from "lucide-react";
import { cn } from "cn";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/expenses/new", label: "Add", icon: CirclePlus },
  { href: "/stats", label: "Stats", icon: ChartNoAxesColumn },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] flex-col items-center justify-center gap-1 py-2 text-xs font-medium",
              isActive ? "text-accent" : "text-muted-foreground",
            )}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
