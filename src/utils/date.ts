export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(isoString: string): string {
  return isoString.slice(0, 10);
}
