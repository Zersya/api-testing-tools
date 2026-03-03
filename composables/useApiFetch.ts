import type { UseFetchOptions } from '#app'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

/**
 * Check if running in Tauri environment
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__
}

/**
 * Production API base URL for Tauri app
 */
const TAURI_API_BASE_URL = 'https://api-mock.transtrack.id'

/**
 * Wrapper around useFetch that automatically prepends the API base URL.
 * In Tauri desktop app: uses Tauri's HTTP plugin directly (bypasses CORS and local server)
 * In web/browser: uses standard Nuxt fetch
 */
export function useApiFetch<T>(
  url: string | (() => string),
  options?: UseFetchOptions<T>
) {
  const config = useRuntimeConfig()

  // Build full URL - prepend base URL for API calls
  const buildUrl = (path: string | null | undefined): string => {
    if (!path || typeof path !== 'string') return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const inTauri = isTauri()
    const baseUrl = inTauri ? TAURI_API_BASE_URL : (config.public.apiBaseUrl || '')
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${cleanPath}`
  }

  // Handle reactive URLs
  const fullUrl = computed(() => buildUrl(typeof url === 'function' ? url() : url))

  // For Tauri: use a custom fetch that bypasses the local server entirely
  const customFetch = async (request: string, opts?: any) => {
    if (isTauri()) {
      // Prepare fetch options
      const fetchOptions: any = {
        method: opts?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...opts?.headers
        }
      }

      // Handle body serialization
      if (opts?.body) {
        if (typeof opts.body === 'string') {
          fetchOptions.body = opts.body
        } else if (opts.body instanceof FormData || opts.body instanceof URLSearchParams) {
          fetchOptions.body = opts.body
          if (opts.body instanceof FormData) {
            delete fetchOptions.headers['Content-Type']
          }
        } else {
          fetchOptions.body = JSON.stringify(opts.body)
        }
      }

      // Use Tauri HTTP plugin directly
      const response = await tauriFetch(request, fetchOptions)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        return await response.json()
      }
      return await response.text()
    }
    return await $fetch(request, opts)
  }

  return useFetch(fullUrl, {
    ...options,
    $fetch: customFetch as any,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })
}

/**
 * Wrapper around $fetch for programmatic API calls
 */
export function useApiClient() {
  const config = useRuntimeConfig()

  const buildUrl = (path: string | null | undefined): string => {
    if (!path || typeof path !== 'string') return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const inTauri = isTauri()
    const baseUrl = inTauri ? TAURI_API_BASE_URL : (config.public.apiBaseUrl || '')
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${cleanPath}`
  }

  const baseFetch = async <T>(path: string, options?: any) => {
    const url = buildUrl(path)

    if (isTauri()) {
      // Prepare fetch options for Tauri
      const fetchOptions: any = {
        method: options?.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      }

      // Handle body serialization
      if (options?.body) {
        if (typeof options.body === 'string') {
          fetchOptions.body = options.body
        } else if (options.body instanceof FormData || options.body instanceof URLSearchParams) {
          fetchOptions.body = options.body
          if (options.body instanceof FormData) {
            delete fetchOptions.headers['Content-Type']
          }
        } else {
          fetchOptions.body = JSON.stringify(options.body)
        }
      }

      // Tauri HTTP plugin - cookies handled automatically via cookie jar
      const response = await tauriFetch(url, fetchOptions)

      // Check for HTTP errors - tauriFetch doesn't throw on non-2xx by default
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      // Return parsed JSON or text based on content type
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        return await response.json() as T
      }
      return await response.text() as unknown as T
    }

    // Non-Tauri: use standard $fetch
    return await $fetch<T>(url, options)
  }

  return {
    request: baseFetch,
    get: <T>(path: string, options?: any) => baseFetch<T>(path, { method: 'GET', ...options }),
    post: <T>(path: string, options?: any) => baseFetch<T>(path, { method: 'POST', ...options }),
    put: <T>(path: string, options?: any) => baseFetch<T>(path, { method: 'PUT', ...options }),
    patch: <T>(path: string, options?: any) => baseFetch<T>(path, { method: 'PATCH', ...options }),
    delete: <T>(path: string, options?: any) => baseFetch<T>(path, { method: 'DELETE', ...options })
  }
}
