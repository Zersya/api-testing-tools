<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

interface Variable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface Props {
  modelValue: string;
  variables?: Variable[];
  pathVariables?: string[]; // Array of path variable names (e.g., ['id', 'userId'])
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

const editorRef = ref<HTMLElement | null>(null);
const showAutocomplete = ref(false);
const autocompleteIndex = ref(0);
const cursorPosition = ref(0);
const isComposing = ref(false);

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;
const PATH_VARIABLE_PATTERN = /:(\w+)/g; // Matches :variableName

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const highlightedContent = computed(() => {
  if (!props.modelValue) return '';

  // Collect all matches from both patterns with their positions
  const matches: Array<{
    startIndex: number;
    endIndex: number;
    fullMatch: string;
    content: string;
    type: 'env' | 'path';
  }> = [];

  // Find environment variable matches {{variable}}
  let match: RegExpExecArray | null;
  while ((match = VARIABLE_PATTERN.exec(props.modelValue)) !== null) {
    const [fullMatch, variableName] = match;
    matches.push({
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
      fullMatch,
      content: variableName.trim(),
      type: 'env'
    });
  }

  // Find path variable matches :variable
  while ((match = PATH_VARIABLE_PATTERN.exec(props.modelValue)) !== null) {
    const [fullMatch, variableName] = match;
    matches.push({
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
      fullMatch,
      content: variableName,
      type: 'path'
    });
  }

  // Sort matches by start index
  matches.sort((a, b) => a.startIndex - b.startIndex);

  // Remove overlapping matches (prefer environment variables if they overlap)
  const filteredMatches: typeof matches = [];
  for (const m of matches) {
    const lastMatch = filteredMatches[filteredMatches.length - 1];
    if (!lastMatch || m.startIndex >= lastMatch.endIndex) {
      filteredMatches.push(m);
    }
  }

  // Build the highlighted HTML
  let result = '';
  let lastIndex = 0;

  for (const m of filteredMatches) {
    // Add text before this match
    result += escapeHtml(props.modelValue.slice(lastIndex, m.startIndex));

    if (m.type === 'env') {
      // Environment variable highlighting
      const variable = props.variables?.find(v => v.key === m.content);
      const isDefined = !!variable;
      const colorClass = isDefined ? 'var-defined' : 'var-undefined';
      const titleAttr = variable
        ? (variable.isSecret ? '••••••••' : escapeHtml(variable.value))
        : 'Undefined variable';

      result += `<span class="${colorClass}" title="${titleAttr}">${escapeHtml(m.fullMatch)}</span>`;
    } else {
      // Path variable highlighting
      const isDefined = props.pathVariables?.includes(m.content);
      const colorClass = isDefined ? 'path-var-defined' : 'path-var-undefined';
      const titleAttr = isDefined
        ? `Path variable: ${escapeHtml(m.content)}`
        : `Undefined path variable: ${escapeHtml(m.content)}`;

      result += `<span class="${colorClass}" title="${titleAttr}">${escapeHtml(m.fullMatch)}</span>`;
    }

    lastIndex = m.endIndex;
  }

  // Add remaining text
  result += escapeHtml(props.modelValue.slice(lastIndex));

  return result;
});

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

const saveSelection = () => {
  const selection = window.getSelection();
  if (!selection || !editorRef.value || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(editorRef.value);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  
  return preCaretRange.toString().length;
};

const restoreSelection = (position: number) => {
  if (!editorRef.value) return;
  
  const treeWalker = document.createTreeWalker(editorRef.value, NodeFilter.SHOW_TEXT, null);
  let currentPos = 0;
  let node: Node | null = null;
  
  while (treeWalker.nextNode()) {
    node = treeWalker.currentNode;
    const nodeLength = node.textContent?.length || 0;
    
    if (currentPos + nodeLength >= position) {
      const range = document.createRange();
      range.setStart(node, Math.min(position - currentPos, nodeLength));
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    
    currentPos += nodeLength;
  }
};

const getEditorText = (): string => {
  if (!editorRef.value) return '';
  
  let text = '';
  const walker = document.createTreeWalker(editorRef.value, NodeFilter.SHOW_TEXT, null);
  let node: Node | null = walker.nextNode();
  
  while (node) {
    text += node.textContent;
    node = walker.nextNode();
  }
  
  return text;
};

const handleInput = () => {
  if (isComposing.value) return;
  
  const content = getEditorText();
  cursorPosition.value = saveSelection() || 0;
  emit('update:modelValue', content);
  
  const textBeforeCursor = content.slice(0, cursorPosition.value);
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
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    showAutocomplete.value = false;
  } else {
    showAutocomplete.value = false;
  }
};

const handleClick = () => {
  cursorPosition.value = saveSelection() || 0;
};

const handleFocus = () => {
  cursorPosition.value = saveSelection() || 0;
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  
  let pasteText = '';
  
  const hasImage = Array.from(clipboardData.items).some(item => {
    return item.type.startsWith('image/');
  });
  
  if (hasImage) {
    return;
  }
  
  const textPlain = clipboardData.getData('text/plain');
  const textHtml = clipboardData.getData('text/html');
  
  if (textHtml) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = textHtml;
    pasteText = tempDiv.textContent || tempDiv.innerText || textPlain;
  } else {
    pasteText = textPlain;
  }
  
  pasteText = pasteText.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  
  if (!pasteText) return;
  
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    insertTextAtCursor(pasteText);
    return;
  }
  
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(pasteText));
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  
  handleInput();
};

const insertTextAtCursor = (text: string) => {
  if (!editorRef.value) return;
  
  const currentContent = getEditorText();
  const cursorPos = saveSelection() || currentContent.length;
  
  const beforeCursor = currentContent.slice(0, cursorPos);
  const afterCursor = currentContent.slice(cursorPos);
  
  const newContent = beforeCursor + text + afterCursor;
  emit('update:modelValue', newContent);
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
};

const closeAutocomplete = () => {
  setTimeout(() => {
    showAutocomplete.value = false;
  }, 200);
};

watch(() => props.modelValue, (newValue) => {
  if (editorRef.value && getEditorText() !== newValue) {
    const savedPos = saveSelection();
    editorRef.value.innerHTML = highlightedContent.value;
    
    if (savedPos !== null) {
      restoreSelection(savedPos);
    }
  }
});

onMounted(() => {
  if (editorRef.value && !editorRef.value.innerHTML) {
    editorRef.value.innerHTML = highlightedContent.value;
  }
  
  document.addEventListener('click', (e) => {
    if (editorRef.value && !editorRef.value.contains(e.target as Node)) {
      showAutocomplete.value = false;
    }
  });
});
</script>

<template>
  <div class="relative variable-input-wrapper">
    <div
      ref="editorRef"
      contenteditable="true"
      :class="['variable-editor', disabled ? 'disabled' : '']"
      :placeholder="placeholder"
      :disabled="disabled"
      @input="handleInput"
      @keydown="handleKeydown"
      @click="handleClick"
      @focus="handleFocus"
      @blur="closeAutocomplete"
      @paste="handlePaste"
      @compositionstart="isComposing = true"
      @compositionend="isComposing = false"
      spellcheck="false"
    ></div>

    <template v-if="showAutocomplete && filteredVariables.length > 0">
      <Teleport to="body">
        <div 
          class="absolute z-[110] w-64 max-h-48 overflow-auto bg-bg-secondary border border-border-default rounded-lg shadow-xl variable-autocomplete"
          :style="{
            top: `${editorRef?.getBoundingClientRect?.()?.bottom + 4 || 0}px`,
            left: `${editorRef?.getBoundingClientRect?.()?.left || 0}px`
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

.variable-editor {
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  outline: none;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

.variable-editor:focus {
  border-color: var(--accent-blue);
}

.variable-editor.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.variable-editor:empty::before {
  content: attr(placeholder);
  color: var(--text-muted);
}

.variable-editor :deep(.var-defined) {
  color: var(--accent-blue);
  font-weight: 500;
}

.variable-editor :deep(.var-undefined) {
  color: var(--accent-orange);
  font-weight: 500;
}

.variable-editor :deep(.path-var-defined) {
  color: var(--accent-green);
  font-weight: 500;
}

.variable-editor :deep(.path-var-undefined) {
  color: var(--accent-orange);
  font-weight: 500;
}

.variable-autocomplete {
  max-height: 192px;
}
</style>
