import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PERSON_LABELS } from "@/lib/person";
import type { PersonTotals } from "@/lib/queries/expenses";

interface SpendingSummaryProps {
  totalMinor: number;
  personTotals: PersonTotals;
  from: string;
  to: string;
}

export function SpendingSummary({
  totalMinor,
  personTotals,
  from,
  to,
}: SpendingSummaryProps) {
  return (
    <div className="rounded-lg bg-primary p-4 text-primary-foreground">
      <p className="text-sm text-primary-foreground/70">Total Spending</p>
      <p
        data-testid="spending-total"
        className="mt-1 text-[32px] leading-tight font-bold"
      >
        {formatMoney(totalMinor)}
      </p>
      <div className="mt-2 flex gap-4 text-sm">
        <p data-testid="total-husband" className="text-primary-foreground">
          {PERSON_LABELS.husband}{" "}
          <span className="font-semibold">
            {formatMoney(personTotals.husbandMinor)}
          </span>
        </p>
        <p data-testid="total-wife" className="text-person-wife-on-primary">
          {PERSON_LABELS.wife}{" "}
          <span className="font-semibold">
            {formatMoney(personTotals.wifeMinor)}
          </span>
        </p>
      </div>
      <p className="mt-1 text-sm text-primary-foreground/70">
        {formatDate(from)} – {formatDate(to)}
      </p>
    </div>
  );
}
