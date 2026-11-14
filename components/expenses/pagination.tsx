import Link from "next/link";
import { cn } from "cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  from: string;
  to: string;
  category: string;
  person: string;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  from,
  to,
  category,
  person,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  function hrefFor(target: number): string {
    const params = new URLSearchParams({
      from,
      to,
      category,
      person,
      page: String(target),
    });
    return `${basePath}?${params.toString()}`;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const linkClass =
    "flex min-h-11 min-w-11 items-center justify-center rounded-md text-sm font-medium";

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        aria-label="Previous page"
        className={cn(
          linkClass,
          "text-lg",
          page <= 1
            ? "pointer-events-none text-muted-foreground/40"
            : "text-foreground",
        )}
      >
        ‹
      </Link>
      {pages.map((candidate) => (
        <Link
          key={candidate}
          href={hrefFor(candidate)}
          aria-current={candidate === page ? "page" : undefined}
          className={cn(
            linkClass,
            candidate === page
              ? "bg-accent text-white"
              : "text-foreground",
          )}
        >
          {candidate}
        </Link>
      ))}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        aria-label="Next page"
        className={cn(
          linkClass,
          "text-lg",
          page >= totalPages
            ? "pointer-events-none text-muted-foreground/40"
            : "text-foreground",
        )}
      >
        ›
      </Link>
    </nav>
  );
}
