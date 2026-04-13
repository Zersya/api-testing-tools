import { ref, computed } from 'vue'
import { datadogRum } from '@datadog/browser-rum'
import { useApiClient } from '~~/composables/useApiFetch'

export interface User {
  id: string
  email: string
  name?: string
  workspaceId: string
  authMethod?: string
}

const user = ref<User | null>(null)
const isAuthenticated = computed(() => !!user.value)

export function useUser() {
  const setUser = (userData: User | null) => {
    user.value = userData
    
    // Set Datadog user context
    if (userData) {
      datadogRum.setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.email,
        workspaceId: userData.workspaceId,
        authMethod: userData.authMethod || 'unknown',
      })
      console.log('[Datadog] User context set:', userData.email)
    } else {
      datadogRum.clearUser()
      console.log('[Datadog] User context cleared')
    }
  }

  const clearUser = () => {
    user.value = null
    datadogRum.clearUser()
  }

  const fetchUser = async (): Promise<User | null> => {
    try {
      const api = useApiClient()
      const response = await api.get<{ status: string; user?: User }>('/api/auth/check')
      if (response.status === 'logged_in' && response.user) {
        setUser(response.user)
        return response.user
      }
      return null
    } catch (error) {
      console.error('[useUser] Failed to fetch user:', error)
      return null
    }
  }

  return {
    user: computed(() => user.value),
    isAuthenticated,
    setUser,
    clearUser,
    fetchUser,
  }
}
