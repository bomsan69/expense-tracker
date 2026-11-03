// Integer cents only; no float-based parsing or rounding for money math (SPEC.md §5).

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const dollarsFormatted = new Intl.NumberFormat("en-US").format(dollars);
  return `${sign}$${dollarsFormatted}.${String(remainder).padStart(2, "0")}`;
}

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export function parseAmountToMinor(input: string): number {
  const trimmed = input.trim();
  const match = AMOUNT_PATTERN.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid amount: ${input}`);
  }
  const [, wholePart, fractionPart = ""] = match;
  const cents = fractionPart.padEnd(2, "0");
  return Number(wholePart) * 100 + Number(cents);
}

// For pre-filling an edit form's amount input with a plain decimal string
// (no currency symbol or thousands separators) — the inverse of parseAmountToMinor.
export function minorToInputValue(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  return `${dollars}.${String(remainder).padStart(2, "0")}`;
}
