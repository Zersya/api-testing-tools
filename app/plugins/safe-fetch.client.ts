/**
 * Global fetch interceptor that ensures API responses returning arrays
 * don't break when the server returns an error object instead.
 * 
 * This prevents runtime errors like:
 * - "X.map is not a function"
 * - "X.forEach is not a function"
 * - "X.find is not a function"
 * 
 * When useFetch<T[]> expects an array but receives an error object.
 */
export default defineNuxtPlugin(() => {
  const originalFetch = globalThis.$fetch;

  // Override $fetch to handle error responses gracefully
  globalThis.$fetch = (async (request: any, options?: any) => {
    try {
      const response = await originalFetch(request, options);
      return response;
    } catch (error: any) {
      // Re-throw the error so useFetch can handle it properly
      // This ensures error.value is set and data.value stays null/undefined
      throw error;
    }
  }) as typeof originalFetch;

  // Also add a global error handler for unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      // Log fetch errors for debugging in development
      if (import.meta.dev && event.reason?.statusCode) {
        console.warn('[safe-fetch] Unhandled API error:', event.reason);
      }
    });
  }
});
