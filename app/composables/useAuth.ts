import { ref, computed } from 'vue'
import { token, user, isAuthenticated, initAuth, setAuth, clearAuth, getToken, type User } from '../services/auth-store'
import { getSettings } from '../services/settings'

export function useAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => isAuthenticated.value)
  const currentUser = computed(() => user.value)

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const settings = await getSettings()
      const response = await fetch(`${settings.serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Login failed')
      }

      const data = await response.json()
      
      if (data.token && data.user) {
        await setAuth(data.token, data.user)
        return true
      }

      throw new Error('Invalid response from server')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    await clearAuth()
  }

  async function checkAuth(): Promise<boolean> {
    await initAuth()
    return isAuthenticated.value
  }

  return {
    token,
    user,
    isLoggedIn,
    currentUser,
    loading,
    error,
    login,
    logout,
    checkAuth,
    getToken
  }
}
