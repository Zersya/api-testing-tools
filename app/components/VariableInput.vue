<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

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

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

const highlightVariables = computed(() => {
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
    
    const colorClass = isDefined ? 'text-accent-blue' : 'text-accent-orange';
    const cursorClass = isDefined ? 'cursor-pointer' : 'cursor-default';
    const titleAttr = variable 
      ? (variable.isSecret ? '••••••••' : variable.value)
      : 'Undefined variable';
    
    result += `<span class="variable-highlight ${colorClass} ${cursorClass}" title="${escapeHtml(titleAttr)}" data-variable="${trimmedName}">${escapeHtml(fullMatch)}</span>`;

    lastIndex = endIndex;
  }

  // Add remaining text
  result += escapeHtml(props.modelValue.slice(lastIndex));

  return result;
});

const filteredVariables = computed(() => {
  if (!props.variables || props.variables.length === 0) return [];

  // Find the current variable being typed
  const beforeCursor = props.modelValue.slice(0, cursorPosition.value);
  
  // Check if user is typing after {{
  const lastDoubleBraceIndex = beforeCursor.lastIndexOf('{{');
  if (lastDoubleBraceIndex === -1) return [];

  const currentTyping = beforeCursor.slice(lastDoubleBraceIndex + 2).trim().toLowerCase();

  return props.variables.filter(v => 
    v.key.toLowerCase().includes(currentTyping)
  );
});

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  cursorPosition.value = target.selectionStart || 0;
  emit('update:modelValue', target.value);
  
  // Show autocomplete if typing '{' after '{'
  const lastTwoChars = target.value.slice(0, cursorPosition.value).slice(-2);
  if (lastTwoChars === '{{') {
    showAutocomplete.value = true;
    autocompleteIndex.value = 0;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (!showAutocomplete.value) return;

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
    // Check if previous char is also '{'
    const lastChar = props.modelValue.slice(0, cursorPosition.value).slice(-1);
    if (lastChar === '{') {
      showAutocomplete.value = true;
      autocompleteIndex.value = 0;
    }
  }
};

const handleFocus = () => {
  cursorPosition.value = inputRef.value?.selectionStart || 0;
};

const handleClick = () => {
  cursorPosition.value = inputRef.value?.selectionStart || 0;
};

const selectVariable = (variable: Variable) => {
  const beforeCursor = props.modelValue.slice(0, cursorPosition.value);
  const afterCursor = props.modelValue.slice(cursorPosition.value);

  // Find the last {{ before cursor
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

  // Move cursor after the inserted variable
  nextTick(() => {
    const newCursorPos = lastDoubleBraceIndex !== -1 
      ? lastDoubleBraceIndex + variable.key.length + 4 
      : newValue.length;
    inputRef.value?.setSelectionRange(newCursorPos, newCursorPos);
    inputRef.value?.focus();
  });
};

const jumpToVariableDefinition = (variableName: string) => {
  const variable = props.variables?.find(v => v.key === variableName);
  if (variable) {
    navigateTo('/admin/environments');
  }
};

const closeAutocomplete = () => {
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
};

// Close autocomplete when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (inputRef.value && !inputRef.value.contains(e.target as Node)) {
      showAutocomplete.value = false;
    }
  });
});
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
      @keydown="handleKeyDown"
      @focus="handleFocus"
      @click="handleClick"
      @blur="closeAutocomplete"
      class="w-full py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
    />

    <template v-if="showAutocomplete && filteredVariables.length > 0">
      <Teleport to="body">
        <div 
          class="absolute z-50 w-64 max-h-48 overflow-auto bg-bg-secondary border border-border-default rounded-lg shadow-xl variable-autocomplete"
          :style="{
            top: `${inputRef?.getBoundingClientRect().bottom + 4}px`,
            left: `${inputRef?.getBoundingClientRect().left}px`
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
.variable-input-wrapper :deep(.variable-highlight) {
  font-weight: 500;
  background: var(--bg-tertiary);
  padding: 0 2px;
  border-radius: 2px;
}

.variable-input-wrapper :deep(.variable-highlight.cursor-pointer) {
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: currentcolor;
  text-decoration-thickness: 1px;
}

.variable-autocomplete {
  max-height: 192px;
}
</style>