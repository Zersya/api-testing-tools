import { getToken } from './auth-store'
import { getServerUrl } from './settings'

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean
}

export function useApi() {
  let baseUrl: string = ''

  async function getBaseUrl(): Promise<string> {
    if (baseUrl) return baseUrl
    baseUrl = await getServerUrl()
    return baseUrl
  }

  async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, ...fetchOptions } = options
    
    const url = await getBaseUrl()
    const headers = new Headers(options.headers || {})
    
    if (requiresAuth) {
      const token = getToken()
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
    }
    
    headers.set('Content-Type', 'application/json')

    const response = await fetch(`${url}${endpoint}`, {
      ...fetchOptions,
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = 'Request failed'
      
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.message || errorJson.error || errorMessage
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`
      }
      
      throw new Error(errorMessage)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    
    return response.text() as unknown as T
  }
  
  return {
    get: <T>(endpoint: string, options?: RequestOptions) => 
      request<T>(endpoint, { ...options, method: 'GET' }),
    
    post: <T>(endpoint: string, body: any, options?: RequestOptions) =>
      request<T>(endpoint, { 
        ...options, 
        method: 'POST',
        body: JSON.stringify(body)
      }),
      
    put: <T>(endpoint: string, body: any, options?: RequestOptions) =>
      request<T>(endpoint, { 
        ...options, 
        method: 'PUT',
        body: JSON.stringify(body)
      }),
      
    patch: <T>(endpoint: string, body: any, options?: RequestOptions) =>
      request<T>(endpoint, { 
        ...options, 
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
      
    delete: <T>(endpoint: string, options?: RequestOptions) =>
      request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}
