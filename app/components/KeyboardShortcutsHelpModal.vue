<script setup lang="ts">
import Modal from './Modal.vue';
import { computed } from 'vue';
import { useKeyboardShortcuts, getShortcutDisplay } from '~/composables/useKeyboardShortcuts';

interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const { shortcuts } = useKeyboardShortcuts({});

const groupedShortcuts = computed(() => {
  const groups: Record<string, typeof shortcuts> = {};
  shortcuts.forEach(shortcut => {
    const category = shortcut.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category]!.push(shortcut);
  });
  return groups;
});

const categoryLabels: Record<string, string> = {
  'Request': 'Request Actions',
  'Tabs': 'Tab Management',
  'Navigation': 'Navigation',
  'General': 'General'
};
</script>

<template>
  <Modal
    :show="show"
    title="Keyboard Shortcuts"
    size="md"
    @close="emit('close')"
  >
    <div class="space-y-6">
      <div
        v-for="(shortcuts, category) in groupedShortcuts"
        :key="category"
      >
        <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
          {{ categoryLabels[category] || category }}
        </h3>
        <div class="space-y-2">
          <div
            v-for="shortcut in shortcuts"
            :key="shortcut.key + (shortcut.ctrl ? 'ctrl' : '') + (shortcut.meta ? 'meta' : '') + (shortcut.shift ? 'shift' : '') + (shortcut.alt ? 'alt' : '')"
            class="flex items-center justify-between py-2 px-3 bg-bg-tertiary rounded-lg"
          >
            <span class="text-sm text-text-primary">{{ shortcut.description }}</span>
            <kbd class="inline-flex items-center gap-1 px-2 py-1 bg-bg-secondary border border-border-default rounded text-xs font-mono text-text-secondary">
              <span v-if="shortcut.meta" class="text-[10px]">⌘</span>
              <span v-if="shortcut.ctrl" class="text-[10px]">Ctrl</span>
              <span v-if="shortcut.alt" class="text-[10px]">⌥</span>
              <span v-if="shortcut.shift" class="text-[10px]">⇧</span>
              <span class="text-xs">{{ shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key }}</span>
            </kbd>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="px-4 py-2 bg-bg-tertiary text-text-secondary rounded border border-border-default text-xs font-medium cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
        @click="emit('close')"
      >
        Close
      </button>
    </template>
  </Modal>
</template>
