/**
 * Plugin to configure global API base URL for Tauri builds.
 * Provides $apiFetch which automatically uses the configured API base URL.
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl as string

  // Create a configured fetch instance
  const apiFetch = $fetch.create({
    baseURL: apiBaseUrl,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  return {
    provide: {
      apiFetch
    }
  }
})
