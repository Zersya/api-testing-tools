<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleClose"></div>
      <div class="relative bg-bg-primary border border-border-primary rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-in">
        <div class="p-6">
          <div class="flex items-center justify-center mb-4">
            <div v-if="result.success" class="w-16 h-16 bg-accent-green/10 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div v-else class="w-16 h-16 bg-accent-yellow/10 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <h2 class="text-xl font-semibold text-text-primary text-center mb-2">
            {{ result.success ? 'Sync Complete' : 'Sync Completed with Errors' }}
          </h2>

          <div class="bg-bg-secondary rounded-lg p-4 mb-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center">
                <p class="text-2xl font-semibold text-accent-green">{{ result.pushed }}</p>
                <p class="text-sm text-text-secondary">Pushed</p>
              </div>
              <div class="text-center">
                <p class="text-2xl font-semibold text-accent-blue">{{ result.pulled }}</p>
                <p class="text-sm text-text-secondary">Pulled</p>
              </div>
            </div>
          </div>

          <div v-if="result.conflicts > 0" class="bg-accent-yellow/10 border border-accent-yellow/20 rounded-lg p-3 mb-4">
            <p class="text-sm text-accent-yellow">
              {{ result.conflicts }} conflict(s) resolved using last-write-wins
            </p>
          </div>

          <div v-if="result.errors.length > 0" class="bg-accent-red/10 border border-accent-red/20 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
            <p class="text-sm text-text-muted mb-2">Errors:</p>
            <ul class="text-xs text-accent-red space-y-1">
              <li v-for="(error, index) in result.errors" :key="index">• {{ error }}</li>
            </ul>
          </div>

          <p class="text-xs text-text-muted text-center mb-4">
            Last synced: {{ formatDate(result.lastSyncedAt) }}
          </p>

          <button 
            @click="handleClose"
            class="w-full py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { DesktopSyncResult } from '@/app/composables/useSync'

defineProps<{
  isOpen: boolean
  result: DesktopSyncResult
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function handleClose() {
  emit('close')
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString()
}
</script>

<style scoped>
@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-modal-in {
  animation: modal-in 0.2s ease-out;
}
</style>
