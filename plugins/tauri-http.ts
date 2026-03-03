// This runs immediately when the plugin file is loaded
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__
console.log('[Tauri HTTP Plugin] File loaded, isTauri:', isTauri)

if (isTauri) {
  const TAURI_API_BASE_URL = 'https://api-mock.transtrack.id'

  const buildUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (!path.startsWith('/')) path = '/' + path
    return `${TAURI_API_BASE_URL}${path}`
  }

  // Store original fetch
  const originalFetch = window.fetch.bind(window)

  // Override window.fetch immediately
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()

    // Only intercept relative URLs
    if (typeof input === 'string' && input.startsWith('/')) {
      const newUrl = buildUrl(input)
      console.log(`[Tauri HTTP] Intercepted: ${input} -> ${newUrl}`)

      // Import Tauri fetch dynamically
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')

      const method = init?.method || 'GET'
      const headers: any = {
        'Content-Type': 'application/json',
        ...(init?.headers as any || {})
      }

      let body = init?.body
      if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams) && !(body instanceof Blob)) {
        body = JSON.stringify(body)
      }
      if (body instanceof FormData) {
        delete headers['Content-Type']
      }

      return await tauriFetch(newUrl, { method, headers, body })
    }

    return originalFetch(input, init)
  }

  console.log('[Tauri HTTP Plugin] window.fetch overridden')

  // Also try to override $fetch if it exists
  if ((globalThis as any).$fetch) {
    const original$fetch = (globalThis as any).$fetch
    ;(globalThis as any).$fetch = async (request: string, opts: any = {}) => {
      if (typeof request === 'string' && request.startsWith('/')) {
        const url = buildUrl(request)
        console.log(`[Tauri HTTP] $fetch intercepted: ${request} -> ${url}`)

        const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http')

        const method = opts?.method || 'GET'
        const headers: any = {
          'Content-Type': 'application/json',
          ...opts?.headers
        }

        let body = opts?.body
        if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
          body = JSON.stringify(body)
        }
        if (body instanceof FormData) {
          delete headers['Content-Type']
        }

        const response = await tauriFetch(url, { method, headers, body })

        if (!response.ok) {
          const error: any = new Error(`HTTP ${response.status}`)
          error.statusCode = response.status
          error.statusMessage = response.statusText
          throw error
        }

        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          return await response.json()
        }
        return await response.text()
      }
      return original$fetch(request, opts)
    }
    console.log('[Tauri HTTP Plugin] $fetch overridden')
  }
}

export default defineNuxtPlugin(() => {
  // Plugin already did its work above
  if (isTauri) {
    console.log('[Tauri HTTP Plugin] Nuxt plugin registered (fetch already overridden)')
  }
})
