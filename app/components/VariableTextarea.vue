<script setup lang="ts">
import { ref, computed, watch } from 'vue';

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

const editorRef = ref<HTMLElement | null>(null);

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const highlightedContent = computed(() => {
  if (!props.modelValue) return '';

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = VARIABLE_PATTERN.exec(props.modelValue)) !== null) {
    const [fullMatch, variableName] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    result += escapeHtml(props.modelValue.slice(lastIndex, startIndex));

    const trimmedName = variableName.trim();
    const variable = props.variables?.find(v => v.key === trimmedName);
    const isDefined = !!variable;
    
    const colorClass = isDefined ? 'var-defined' : 'var-undefined';
    const titleAttr = variable 
      ? (variable.isSecret ? '••••••••' : escapeHtml(variable.value))
      : 'Undefined variable';
    
    result += `<span class="${colorClass}" title="${titleAttr}">${escapeHtml(fullMatch)}</span>`;

    lastIndex = endIndex;
  }

  result += escapeHtml(props.modelValue.slice(lastIndex));

  if (props.modelValue.endsWith('\n')) {
    result += '\n';
  }

  return result;
});

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

const saveSelection = () => {
  const selection = window.getSelection();
  if (!selection || !editorRef.value) return null;
  
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

const handleInput = () => {
  const content = getEditorText();
  emit('update:modelValue', content);
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
</script>

<template>
  <div class="relative variable-textarea-wrapper">
    <div
      ref="editorRef"
      contenteditable="true"
      :class="['variable-editor', disabled ? 'disabled' : '']"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      @input="handleInput"
      spellcheck="false"
    ></div>
  </div>
</template>

<style scoped>
.variable-textarea-wrapper {
  position: relative;
  width: 100%;
}

.variable-editor {
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
  white-space: pre-wrap;
  word-break: break-all;
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
</style>
