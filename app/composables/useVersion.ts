import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'mock-service-last-seen-version'

const currentVersion = ref<string>('')
const previousVersion = ref<string | null>(null)
const isNewVersion = ref<boolean>(false)
const isDismissed = ref<boolean>(false)

export function useVersion() {
  const config = useRuntimeConfig()

  const hasNewVersion = computed(() => {
    return isNewVersion.value && !isDismissed.value
  })

  const checkVersion = () => {
    if (typeof window === 'undefined') return

    const version = config.public.appVersion as string || '0.0.0'
    currentVersion.value = version

    const lastSeen = localStorage.getItem(STORAGE_KEY)

    if (lastSeen && lastSeen !== version) {
      isNewVersion.value = true
      previousVersion.value = lastSeen
    } else {
      isNewVersion.value = false
      previousVersion.value = null
    }

    localStorage.setItem(STORAGE_KEY, version)
  }

  const markVersionAsSeen = () => {
    isDismissed.value = true
    if (typeof window !== 'undefined' && currentVersion.value) {
      localStorage.setItem(STORAGE_KEY, currentVersion.value)
    }
  }

  const resetVersionState = () => {
    isDismissed.value = false
    isNewVersion.value = false
  }

  onMounted(() => {
    checkVersion()
  })

  return {
    currentVersion: computed(() => currentVersion.value),
    previousVersion: computed(() => previousVersion.value),
    isNewVersion: computed(() => isNewVersion.value),
    hasNewVersion,
    markVersionAsSeen,
    checkVersion,
    resetVersionState
  }
}
