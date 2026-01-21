import { Store } from '@tauri-apps/plugin-store'
import { ref, computed } from 'vue'

const store = new Store('auth.json')
const tokenKey = 'access_token'
const userKey = 'user'

export interface User {
  id: string
  email: string
  name?: string
  workspaceId?: string
}

export const token = ref<string | null>(null)
export const user = ref<User | null>(null)
export const isAuthenticated = computed(() => !!token.value)

export async function initAuth(): Promise<void> {
  try {
    const storedToken = await store.get<string>(tokenKey)
    const storedUser = await store.get<User>(userKey)
    
    if (storedToken) {
      token.value = storedToken
      user.value = storedUser
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error)
  }
}

export async function setAuth(tokenValue: string, userValue: User): Promise<void> {
  await store.set(tokenKey, tokenValue)
  await store.set(userKey, userValue)
  await store.save()
  
  token.value = tokenValue
  user.value = userValue
}

export async function clearAuth(): Promise<void> {
  await store.delete(tokenKey)
  await store.delete(userKey)
  await store.save()
  
  token.value = null
  user.value = null
}

export function getToken(): string | null {
  return token.value
}

export function getUser(): User | null {
  return user.value
}
