import { ref, watch, type Ref } from 'vue'

/**
 * Composable to persist expansion state (Set of IDs) to localStorage
 * Used for tree view components like the sidebar folder structure
 */
export function useExpandedState(storageKey: string, initialValue: string[] = []): Ref<Set<string>> {
  const state = ref<Set<string>>(new Set(initialValue))

  // Load from localStorage on client-side only
  const loadState = () => {
    if (typeof window === 'undefined') return

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          state.value = new Set(parsed)
        }
      }
    } catch (e) {
      console.warn(`Failed to load expanded state for ${storageKey}:`, e)
    }
  }

  // Save to localStorage whenever state changes
  const saveState = () => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(state.value)))
    } catch (e) {
      console.warn(`Failed to save expanded state for ${storageKey}:`, e)
    }
  }

  // Load on initialization (client-side)
  onMounted(() => {
    loadState()
  })

  // Watch for changes and persist
  watch(
    () => Array.from(state.value),
    () => {
      saveState()
    },
    { deep: true }
  )

  return state
}
