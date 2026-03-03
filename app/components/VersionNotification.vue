<script setup lang="ts">
const { hasNewVersion, currentVersion, previousVersion, markVersionAsSeen } = useVersion()

let autoDismissTimeout: ReturnType<typeof setTimeout> | null = null

const dismiss = () => {
  markVersionAsSeen()
  if (autoDismissTimeout) {
    clearTimeout(autoDismissTimeout)
  }
}

onMounted(() => {
  if (hasNewVersion.value) {
    autoDismissTimeout = setTimeout(() => {
      markVersionAsSeen()
    }, 5000)
  }
})

onUnmounted(() => {
  if (autoDismissTimeout) {
    clearTimeout(autoDismissTimeout)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="hasNewVersion"
        class="fixed bottom-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 bg-bg-secondary border border-accent-orange/30 rounded-lg shadow-lg max-w-sm"
      >
        <!-- Update Icon -->
        <div class="flex-shrink-0 w-8 h-8 bg-accent-orange/15 rounded-full flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-orange">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>

        <!-- Message -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text-primary">
            Updated to v{{ currentVersion }}
          </p>
          <p v-if="previousVersion" class="text-xs text-text-muted">
            Previous: v{{ previousVersion }}
          </p>
        </div>

        <!-- Dismiss Button -->
        <button
          @click="dismiss"
          class="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors duration-fast"
          aria-label="Dismiss notification"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 300ms ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
