<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleCancel"></div>
      <div class="relative bg-bg-primary border border-border-primary rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-modal-in">
        <div class="flex items-center justify-between px-6 py-4 border-b border-border-primary">
          <h2 class="text-lg font-semibold text-text-primary">Sync Conflicts Detected</h2>
          <button @click="handleCancel" class="text-text-secondary hover:text-text-primary transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 overflow-y-auto max-h-[60vh]">
          <div v-if="conflicts.length === 0" class="text-center py-8">
            <div class="text-accent-green text-5xl mb-4">✓</div>
            <p class="text-text-secondary">No conflicts found.</p>
          </div>

          <div v-else>
            <p class="text-text-secondary mb-4">
              {{ conflicts.length }} conflict(s) detected. The following items have been modified both locally and on the server.
              Please choose how to resolve each conflict.
            </p>

            <div class="space-y-3">
              <div v-for="(conflict, index) in conflicts" :key="conflict.id" 
                   class="bg-bg-secondary border border-border-primary rounded-lg p-4">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <p class="font-medium text-text-primary">{{ conflict.name || conflict.type }}</p>
                    <p class="text-sm text-text-secondary">{{ formatType(conflict.type) }}</p>
                  </div>
                  <span class="text-xs text-text-muted bg-bg-tertiary px-2 py-1 rounded">
                    {{ conflict.id.slice(0, 8) }}...
                  </span>
                </div>

                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="bg-bg-primary border border-border-primary rounded p-3">
                    <p class="text-xs text-text-muted mb-2 uppercase tracking-wide">Local Changes</p>
                    <p class="text-text-secondary">Modified: {{ formatDate(conflict.localUpdatedAt) }}</p>
                  </div>
                  <div class="bg-bg-primary border border-border-primary rounded p-3">
                    <p class="text-xs text-text-muted mb-2 uppercase tracking-wide">Server Changes</p>
                    <p class="text-text-secondary">Modified: {{ formatDate(conflict.remoteUpdatedAt) }}</p>
                  </div>
                </div>

                <div class="mt-3 flex items-center justify-end gap-3">
                  <button 
                    @click="setResolution(conflict.id, 'server')"
                    :class="[
                      'px-3 py-1.5 text-sm rounded-lg transition-colors',
                      resolutions[conflict.id] === 'server' 
                        ? 'bg-accent-blue text-white' 
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary'
                    ]"
                  >
                    Use Server
                  </button>
                  <button 
                    @click="setResolution(conflict.id, 'local')"
                    :class="[
                      'px-3 py-1.5 text-sm rounded-lg transition-colors',
                      resolutions[conflict.id] === 'local' 
                        ? 'bg-accent-blue text-white' 
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-primary'
                    ]"
                  >
                    Keep Local
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-primary bg-bg-secondary">
          <button 
            @click="handleCancel"
            class="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="handleApply"
            :disabled="!hasAllResolutions"
            :class="[
              'px-4 py-2 text-sm rounded-lg transition-colors',
              hasAllResolutions 
                ? 'bg-accent-blue text-white hover:bg-accent-blue/90' 
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
            ]"
          >
            Apply Resolution ({{ Object.keys(resolutions).length }}/{{ conflicts.length }})
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Conflict {
  id: string
  type: string
  name: string
  localUpdatedAt: string
  remoteUpdatedAt: string
}

const props = defineProps<{
  isOpen: boolean
  conflicts: Conflict[]
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'apply', resolutions: Record<string, 'local' | 'server'>): void
}>()

const resolutions = ref<Record<string, 'local' | 'server'>>({})

watch(() => props.conflicts, () => {
  resolutions.value = {}
}, { deep: true })

const hasAllResolutions = computed(() => {
  return props.conflicts.every(c => resolutions.value[c.id])
})

function setResolution(id: string, resolution: 'local' | 'server') {
  resolutions.value[id] = resolution
}

function handleCancel() {
  resolutions.value = {}
  emit('cancel')
}

function handleApply() {
  if (hasAllResolutions.value) {
    emit('apply', { ...resolutions.value })
    resolutions.value = {}
  }
}

function formatType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleString()
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
