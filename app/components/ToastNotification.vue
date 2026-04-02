<script setup lang="ts">
import { useToast } from '~/composables/useToast';

const { toastState, hideToast } = useToast();
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toastState.show"
        class="fixed bottom-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 bg-bg-secondary border rounded-lg shadow-lg max-w-sm"
        :class="toastState.type === 'success' ? 'border-accent-green/30' : 'border-accent-red/30'"
      >
        <!-- Icon -->
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          :class="toastState.type === 'success' ? 'bg-accent-green/15' : 'bg-accent-red/15'"
        >
          <svg
            v-if="toastState.type === 'success'"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-accent-green"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg
            v-else
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-accent-red"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <!-- Message -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium" :class="toastState.type === 'success' ? 'text-accent-green' : 'text-accent-red'">
            {{ toastState.message }}
          </p>
        </div>

        <!-- Dismiss Button -->
        <button
          @click="hideToast"
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
