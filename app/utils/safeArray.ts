/**
 * Safely convert a value to an array.
 * Handles cases where API returns undefined, null, or an object with data property.
 */
export function safeArray<T>(value: T[] | null | undefined | { data?: T[] } | unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && 'data' in (value as object) && Array.isArray((value as { data?: T[] }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
}

/**
 * Safely get length of an array-like value
 */
export function safeLength(value: unknown[] | null | undefined | unknown): number {
  if (Array.isArray(value)) return value.length;
  return 0;
}
