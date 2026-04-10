<script setup lang="ts">
interface Props {
  modelValue: 'grid' | 'list';
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: 'grid' | 'list'];
}>();

const toggleView = (view: 'grid' | 'list') => {
  emit('update:modelValue', view);
};
</script>

<template>
  <div class="flex items-center gap-1 bg-bg-input border border-border-default rounded-lg p-1">
    <button
      type="button"
      :class="[
        'flex items-center justify-center w-8 h-7 rounded transition-all duration-fast',
        modelValue === 'grid'
          ? 'bg-bg-secondary text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-primary'
      ]"
      @click="toggleView('grid')"
      title="Grid view"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </button>
    <button
      type="button"
      :class="[
        'flex items-center justify-center w-8 h-7 rounded transition-all duration-fast',
        modelValue === 'list'
          ? 'bg-bg-secondary text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-primary'
      ]"
      @click="toggleView('list')"
      title="List view"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    </button>
  </div>
</template>
