<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Variable {
  id: string
  key: string
  value: string
  isSecret: boolean
}

interface Props {
  variable: Variable | null
  environmentName?: string
  showDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  showDelay: 300
})

const emit = defineEmits<{
  copy: [value: string]
}>()

const isVisible = ref(false)
const showTimeout = ref<number | null>(null)
const isRevealingSecret = ref(false)
const revealTimeout = ref<number | null>(null)
const tooltipRef = ref<HTMLElement | null>(null)
const anchorRef = ref<HTMLElement | null>(null)

const displayValue = computed(() => {
  if (!props.variable) return ''
  if (props.variable.isSecret && !isRevealingSecret.value) {
    return '••••••••'
  }
  return props.variable.value
})

const position = computed(() => {
  if (!tooltipRef.value || !anchorRef.value) return { top: '0px', left: '0px' }
  
  const anchorRect = anchorRef.value.getBoundingClientRect()
  const tooltipRect = tooltipRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  let top = anchorRect.bottom + 8
  let left = anchorRect.left
  
  if (left + tooltipRect.width > viewportWidth - 16) {
    left = viewportWidth - tooltipRect.width - 16
  }
  
  if (left < 16) {
    left = 16
  }
  
  if (top + tooltipRect.height > viewportHeight - 16) {
    top = anchorRect.top - tooltipRect.height - 8
  }
  
  return {
    top: `${top}px`,
    left: `${left}px`
  }
})

const handleMouseEnter = () => {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  showTimeout.value = window.setTimeout(() => {
    isVisible.value = true
  }, props.showDelay)
}

const handleMouseLeave = () => {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
    showTimeout.value = null
  }
  isVisible.value = false
  isRevealingSecret.value = false
  if (revealTimeout.value) {
    clearTimeout(revealTimeout.value)
    revealTimeout.value = null
  }
}

const handleEyeHover = () => {
  if (!props.variable?.isSecret) return
  
  if (revealTimeout.value) {
    clearTimeout(revealTimeout.value)
  }
  revealTimeout.value = window.setTimeout(() => {
    isRevealingSecret.value = true
  }, 200)
}

const handleEyeLeave = () => {
  if (revealTimeout.value) {
    clearTimeout(revealTimeout.value)
    revealTimeout.value = null
  }
  isRevealingSecret.value = false
}

const copyValue = async () => {
  if (!props.variable) return
  
  try {
    await navigator.clipboard.writeText(props.variable.value)
    emit('copy', props.variable.value)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

onUnmounted(() => {
  if (showTimeout.value) {
    clearTimeout(showTimeout.value)
  }
  if (revealTimeout.value) {
    clearTimeout(revealTimeout.value)
  }
})
</script>

<template>
  <div
    ref="anchorRef"
    class="variable-tooltip-anchor"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </div>
  
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-if="isVisible && variable"
        ref="tooltipRef"
        class="variable-tooltip"
        :style="position"
        @mouseenter="handleMouseEnter"
        @mouseleave="handleMouseLeave"
      >
        <div class="tooltip-header">
          <span class="variable-key">{{ variable.key }}</span>
          <span v-if="environmentName" class="environment-badge">{{ environmentName }}</span>
        </div>
        
        <div class="tooltip-value">
          <span class="value-text">{{ displayValue }}</span>
          
          <div
            v-if="variable.isSecret"
            class="eye-icon"
            @mouseenter="handleEyeHover"
            @mouseleave="handleEyeLeave"
          >
            <svg
              v-if="!isRevealingSecret"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg
              v-else
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          
          <button
            class="copy-button"
            @click="copyValue"
            title="Copy value"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
        
        <div v-if="variable.isSecret" class="tooltip-hint">
          Hover over eye icon to reveal
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.variable-tooltip-anchor {
  display: inline;
}

.variable-tooltip {
  position: fixed;
  z-index: 9999;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 200px;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
  font-size: 12px;
}

.tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.variable-key {
  font-weight: 600;
  color: var(--accent-blue);
  font-family: var(--font-mono);
}

.environment-badge {
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tooltip-value {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.value-text {
  color: var(--text-primary);
  font-family: var(--font-mono);
  word-break: break-all;
  flex: 1;
}

.eye-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s;
}

.eye-icon:hover {
  color: var(--accent-blue);
  background: var(--bg-hover);
}

.copy-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s;
}

.copy-button:hover {
  color: var(--accent-blue);
  background: var(--bg-hover);
}

.tooltip-hint {
  margin-top: 4px;
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
}

.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>