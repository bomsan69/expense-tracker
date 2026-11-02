const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function parseIsoParts(iso: string): [number, number, number] {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const [, yearPart, monthPart, dayPart] = match;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${iso}`);
  }
  return [year, month, day];
}

export function isValidIsoDate(iso: string): boolean {
  try {
    parseIsoParts(iso);
    return true;
  } catch {
    return false;
  }
}

export function formatDate(iso: string): string {
  const [year, month, day] = parseIsoParts(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = parseIsoParts(iso);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function defaultDateRange(): { from: string; to: string } {
  const to = todayIso();
  return { from: addDays(to, -7), to };
}
