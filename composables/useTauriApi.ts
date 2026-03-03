import { invoke } from '@tauri-apps/api/tauri'

interface ApiOptions {
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

const invokeCommand = async <T>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  options?: ApiOptions
): Promise<T> => {
  return await invoke<T>('fetch', {
    options: { url, method, ...options }
  })
}

export const useTauriApi = () => {
  return {
    get: async <T>(url: string, options?: ApiOptions): Promise<T> => {
      return await invokeCommand<T>(url, 'GET', options)
    },
    post: async <T>(url: string, options?: ApiOptions): Promise<T> => {
      return await invokeCommand<T>(url, 'POST', options)
    },
    put: async <T>(url: string, options?: ApiOptions): Promise<T> => {
      return await invokeCommand<T>(url, 'PUT', options)
    },
    patch: async <T>(url: string, options?: ApiOptions): Promise<T> => {
      return await invokeCommand<T>(url, 'PATCH', options)
    },
    delete: async <T>(url: string, options?: ApiOptions): Promise<T> => {
      return await invokeCommand<T>(url, 'DELETE', options)
    }
  }
}
