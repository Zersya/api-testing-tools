/**
 * A type-safe wrapper around useFetch that guarantees array data.
 * 
 * This solves the runtime issue where useFetch<T[]> can return error objects
 * instead of arrays, causing ".map is not a function" errors.
 * 
 * Usage:
 *   // Before (unsafe - can crash at runtime)
 *   const { data } = await useFetch<User[]>('/api/users');
 *   data.value.map(...) // CRASH if API returns error object
 * 
 *   // After (safe - always returns array)
 *   const { data } = await useSafeArrayFetch<User>('/api/users');
 *   data.value.map(...) // Always works, returns [] on error
 */
export async function useSafeArrayFetch<T>(
  url: Parameters<typeof useFetch>[0],
  options?: Parameters<typeof useFetch>[1]
) {
  const result = await useFetch<T[]>(url, options);

  // Create a computed that guarantees an array
  const safeData = computed<T[]>(() => {
    const data = result.data.value;
    return Array.isArray(data) ? data : [];
  });

  return {
    ...result,
    data: safeData,
    // Keep original data accessible if needed
    rawData: result.data
  };
}
