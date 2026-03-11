// This runs immediately when the plugin file is loaded
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__
console.log('[Tauri HTTP Plugin] File loaded, isTauri:', isTauri)

if (isTauri) {
  const getConfiguredApiBaseUrl = (): string => {
    const publicConfig = (window as any).__NUXT__?.config?.public
    if (publicConfig && typeof publicConfig.apiBaseUrl === 'string') {
      return publicConfig.apiBaseUrl
    }
    return ''
  }

  const TAURI_API_BASE_URL = (getConfiguredApiBaseUrl() || 'https://api-mock.transtrack.id').replace(/\/+$/, '')

  const buildUrl = (path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path

    const cleanPath = path.startsWith('/') ? path : `/${path}`
    let resolvedPath = cleanPath

    // Prevent duplicated /api segment when base URL already includes it
    if (TAURI_API_BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')) {
      resolvedPath = cleanPath.slice('/api'.length)
    }

    return `${TAURI_API_BASE_URL}${resolvedPath}`
  }

  // Store original fetch
  const originalFetch = window.fetch.bind(window)

  // Override window.fetch immediately
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()

    // Only intercept relative URLs, but skip SSO auth routes (they need to be handled locally)
    if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('/api/auth/sso')) {
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
      // Skip SSO auth routes (they need to be handled locally)
      if (typeof request === 'string' && request.startsWith('/') && !request.startsWith('/api/auth/sso')) {
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
