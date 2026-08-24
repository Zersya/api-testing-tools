export interface FormatDateTimeOptions {
  includeSeconds?: boolean;
  includeTimeZone?: boolean;
}

export function formatDateTime(
  value: string | Date | null | undefined,
  options: FormatDateTimeOptions = {}
): string {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const { includeSeconds = true, includeTimeZone = true } = options;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    timeZoneName: includeTimeZone ? 'short' : undefined,
  }).format(date);
}

export function getClientTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
