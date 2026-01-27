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
const showVariables = ref(false);

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

const getVariableInfo = (key: string) => {
  return props.variables?.find(v => v.key === key);
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};

const handleFocus = () => {
  showVariables.value = true;
};

const handleBlur = () => {
  showVariables.value = false;
};

const formatVariablePreview = (text: string): string => {
  return text.replace(VARIABLE_PATTERN, (match, name) => {
    const trimmedName = name.trim();
    const variable = getVariableInfo(trimmedName);
    if (variable) {
      return `<span class="text-accent-blue font-medium">${match}</span>`;
    }
    return `<span class="text-accent-orange font-medium">${match}</span>`;
  });
};
</script>

<template>
  <div class="relative variable-textarea-wrapper">
    <textarea
      ref="textareaRef"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      class="variable-textarea"
    />

    <div 
      v-if="showVariables && modelValue.includes('{{')"
      class="variable-preview"
      v-html="formatVariablePreview(modelValue)"
    ></div>
  </div>
</template>

<style scoped>
.variable-textarea-wrapper {
  position: relative;
  width: 100%;
}

.variable-textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  outline: none;
  resize: none;
  overflow-y: auto;
}

.variable-textarea:focus {
  border-color: var(--accent-blue);
}

.variable-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.variable-textarea::placeholder {
  color: var(--text-muted);
}

.variable-preview {
  position: absolute;
  top: -20px;
  left: 0;
  right: 0;
  padding: 4px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 10;
}
</style>
