<script setup lang="ts">
import { ref, computed } from 'vue';

interface Variable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface Props {
  modelValue: string;
  variables?: Variable[];
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  rows: 3,
  disabled: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

const highlightedContent = computed(() => {
  if (!props.modelValue) return '';

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_PATTERN.exec(props.modelValue)) !== null) {
    const [fullMatch, variableName] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Text before the variable
    result += escapeHtml(props.modelValue.slice(lastIndex, startIndex));

    // Highlight the variable
    const trimmedName = variableName.trim();
    const variable = props.variables?.find(v => v.key === trimmedName);
    const isDefined = !!variable;
    
    const colorClass = isDefined 
      ? 'text-accent-blue underline decoration-dotted decoration-accent-blue/50' 
      : 'text-accent-orange underline decoration-dotted decoration-accent-orange/50';
    
    const titleAttr = variable 
      ? (variable.isSecret ? '••••••••' : variable.value)
      : 'Undefined variable';
    
    result += `<span class="variable-highlight ${colorClass}" title="${escapeHtml(titleAttr)}">${escapeHtml(fullMatch)}</span>`;

    lastIndex = endIndex;
  }

  // Add remaining text
  result += escapeHtml(props.modelValue.slice(lastIndex));

  // Ensure trailing newline is preserved for proper scrolling
  if (props.modelValue.endsWith('\n')) {
    result += '\n';
  }

  return result;
});

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const handleScroll = () => {
  if (textareaRef.value) {
    const backdrop = textareaRef.value.previousElementSibling as HTMLElement;
    if (backdrop) {
      backdrop.scrollTop = textareaRef.value.scrollTop;
      backdrop.scrollLeft = textareaRef.value.scrollLeft;
    }
  }
};

const backdropDiv = ref<HTMLElement | null>(null);

const syncScroll = () => {
  if (textareaRef.value && backdropDiv.value) {
    backdropDiv.value.scrollTop = textareaRef.value.scrollTop;
    backdropDiv.value.scrollLeft = textareaRef.value.scrollLeft;
  }
};

const handleInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value);
  syncScroll();
};
</script>

<template>
  <div class="relative variable-textarea-wrapper">
    <div
      ref="backdropDiv"
      class="absolute inset-0 p-2 bg-bg-input border border-border-default rounded overflow-hidden pointer-events-none whitespace-pre-wrap break-words"
      :style="{ height: `${textareaRef?.scrollHeight || 0}px` }"
    >
      <div 
        class="text-xs font-mono leading-relaxed min-h-full"
        v-html="highlightedContent"
      ></div>
    </div>
    <textarea
      ref="textareaRef"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      @input="handleInput"
      @scroll="syncScroll"
      class="relative w-full p-2 bg-transparent border border-border-default rounded text-text-primary text-xs font-mono leading-relaxed resize-none focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
      style="color: transparent; caret-color: var(--text-primary);"
    />
  </div>
</template>

<style scoped>
.variable-textarea-wrapper :deep(.variable-highlight) {
  font-weight: 500;
  background: var(--bg-tertiary);
  padding: 0 2px;
  border-radius: 2px;
}

/* Ensure the backdrop and textarea have matching styles */
.variable-textarea-wrapper > div,
.variable-textarea-wrapper textarea {
  font-family: ui-monospace, Monaco, 'Cascadia Code', 'Segoe UI Mono', 'Roboto Mono', 'Oxygen Mono', 'Ubuntu monospace', monospace;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0em;
}
</style>