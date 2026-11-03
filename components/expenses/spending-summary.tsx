import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

interface SpendingSummaryProps {
  totalMinor: number;
  from: string;
  to: string;
}

export function SpendingSummary({ totalMinor, from, to }: SpendingSummaryProps) {
  return (
    <div className="rounded-lg bg-primary p-4 text-primary-foreground">
      <p className="text-sm text-primary-foreground/70">Total Spending</p>
      <p
        data-testid="spending-total"
        className="mt-1 text-[32px] leading-tight font-bold"
      >
        {formatMoney(totalMinor)}
      </p>
      <p className="mt-1 text-sm text-primary-foreground/70">
        {formatDate(from)} – {formatDate(to)}
      </p>
    </div>
  );
}
