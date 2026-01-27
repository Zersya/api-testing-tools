<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';

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
  type?: 'text' | 'password';
  disabled?: boolean;
  autoFocus?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  autoFocus: false
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const showAutocomplete = ref(false);
const autocompleteIndex = ref(0);
const cursorPosition = ref(0);
const showVariables = ref(false);

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

const filteredVariables = computed(() => {
  if (!props.variables || props.variables.length === 0) return [];

  const beforeCursor = props.modelValue.slice(0, cursorPosition.value);
  const lastDoubleBraceIndex = beforeCursor.lastIndexOf('{{');
  if (lastDoubleBraceIndex === -1) return [];

  const currentTyping = beforeCursor.slice(lastDoubleBraceIndex + 2).trim().toLowerCase();

  return props.variables.filter(v => 
    v.key.toLowerCase().includes(currentTyping)
  );
});

const getVariableInfo = (key: string) => {
  return props.variables?.find(v => v.key === key);
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  cursorPosition.value = target.selectionStart || 0;
  emit('update:modelValue', target.value);
  
  const textBeforeCursor = target.value.slice(0, cursorPosition.value);
  const lastTwoChars = textBeforeCursor.slice(-2);
  if (lastTwoChars === '{{') {
    showAutocomplete.value = true;
    autocompleteIndex.value = 0;
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!showAutocomplete.value) {
    if (event.key === '{') {
      const textBeforeCursor = props.modelValue.slice(0, cursorPosition.value);
      const lastChar = textBeforeCursor.slice(-1);
      if (lastChar === '{') {
        showAutocomplete.value = true;
        autocompleteIndex.value = 0;
      }
    }
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    autocompleteIndex.value = Math.min(autocompleteIndex.value + 1, filteredVariables.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    autocompleteIndex.value = Math.max(autocompleteIndex.value - 1, 0);
  } else if (event.key === 'Enter' && filteredVariables.value.length > 0) {
    event.preventDefault();
    selectVariable(filteredVariables.value[autocompleteIndex.value]);
  } else if (event.key === 'Escape') {
    showAutocomplete.value = false;
  } else if (event.key === '{') {
    const textBeforeCursor = props.modelValue.slice(0, cursorPosition.value);
    const lastChar = textBeforeCursor.slice(-1);
    if (lastChar === '{') {
      showAutocomplete.value = true;
      autocompleteIndex.value = 0;
    }
  } else {
    showAutocomplete.value = false;
  }
};

const handleFocus = () => {
  cursorPosition.value = inputRef.value?.selectionStart || 0;
  showVariables.value = true;
};

const handleBlur = () => {
  showVariables.value = false;
};

const handleClick = () => {
  cursorPosition.value = inputRef.value?.selectionStart || 0;
};

const selectVariable = (variable: Variable) => {
  const beforeCursor = props.modelValue.slice(0, cursorPosition.value);
  const afterCursor = props.modelValue.slice(cursorPosition.value);
  
  const lastDoubleBraceIndex = beforeCursor.lastIndexOf('{{');
  
  let newValue: string;
  if (lastDoubleBraceIndex !== -1) {
    const beforeTyping = beforeCursor.slice(0, lastDoubleBraceIndex);
    newValue = beforeTyping + `{{${variable.key}}}` + afterCursor;
  } else {
    newValue = props.modelValue + `{{${variable.key}}}`;
  }

  emit('update:modelValue', newValue);
  showAutocomplete.value = false;

  nextTick(() => {
    const newCursorPos = lastDoubleBraceIndex !== -1 
      ? lastDoubleBraceIndex + variable.key.length + 4 
      : newValue.length;
    inputRef.value?.setSelectionRange(newCursorPos, newCursorPos);
    inputRef.value?.focus();
  });
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
  <div class="relative variable-input-wrapper">
    <input
      ref="inputRef"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :autofocus="autoFocus"
      @input="handleInput"
      @keydown="handleKeydown"
      @focus="handleFocus"
      @blur="handleBlur"
      @click="handleClick"
      class="variable-input"
    />

    <div 
      v-if="showVariables && modelValue.includes('{{')"
      class="variable-preview"
      v-html="formatVariablePreview(modelValue)"
    ></div>

    <template v-if="showAutocomplete && filteredVariables.length > 0">
      <Teleport to="body">
        <div 
          class="absolute z-50 w-64 max-h-48 overflow-auto bg-bg-secondary border border-border-default rounded-lg shadow-xl variable-autocomplete"
          :style="{
            top: `${inputRef?.getBoundingClientRect?.()?.bottom + 4 || 0}px`,
            left: `${inputRef?.getBoundingClientRect?.()?.left || 0}px`
          }"
        >
          <div
            v-for="(variable, index) in filteredVariables"
            :key="variable.id"
            @click="selectVariable(variable)"
            @mouseenter="autocompleteIndex = index"
            class="px-3 py-2 cursor-pointer transition-colors duration-fast"
            :class="[
              index === autocompleteIndex
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs">{{ variable.key }}</span>
              <span v-if="variable.isSecret" class="text-[10px] text-accent-orange">••••</span>
            </div>
            <div v-if="!variable.isSecret" class="text-[10px] text-text-muted truncate">
              {{ variable.value }}
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.variable-input-wrapper {
  position: relative;
  width: 100%;
}

.variable-input {
  width: 100%;
  padding: 6px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  outline: none;
}

.variable-input:focus {
  border-color: var(--accent-blue);
}

.variable-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.variable-input::placeholder {
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

.variable-autocomplete {
  max-height: 192px;
}
</style>
