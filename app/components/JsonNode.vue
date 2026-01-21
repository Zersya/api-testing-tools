<script setup lang="ts">
interface Props {
  node: any;
  searchQuery: string;
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [path: string];
}>();

const getNodeClass = (type: string) => {
  switch (type) {
    case 'string':
      return 'text-accent-green';
    case 'number':
      return 'text-accent-orange';
    case 'boolean':
      return 'text-accent-purple';
    case 'null':
      return 'text-accent-red';
    case 'key':
      return 'text-accent-blue';
    default:
      return 'text-text-primary';
  }
};

const isHighlighted = (value: string, query: string) => {
  if (!query) return false;
  return value.toLowerCase().includes(query.toLowerCase());
};

const highlightText = (text: string, query: string): string => {
  if (!query) return text;
  
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark class="bg-accent-yellow text-text-primary px-0.5 rounded">$1</mark>');
};

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const quoteString = (value: string): string => {
  return `"${value.replace(/"/g, '\\"')}"`;
};
</script>

<template>
  <div v-if="node" class="json-node">
    <template v-if="node.type === 'array'">
      <div class="flex items-start py-0.5">
        <button
          @click="$emit('toggle', node.path)"
          class="p-0.5 text-text-muted hover:text-text-secondary transition-colors duration-fast flex-shrink-0"
        >
          <svg v-if="node.expanded" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <span class="text-text-secondary">[</span>
        <span v-if="!node.expanded && node.length > 0" class="ml-2 text-text-muted">
          {{ node.length }} items...
        </span>
        <span v-if="!node.expanded">]</span>
      </div>
      
      <div v-if="node.expanded" class="ml-6">
        <div v-for="(child, index) in node.children" :key="child.path" class="relative">
          <JsonNode
            :node="child"
            :search-query="searchQuery"
            @toggle="$emit('toggle', $event)"
          />
          <span v-if="index < node.children.length - 1" class="text-text-secondary">,</span>
        </div>
        <div class="flex items-start py-0.5">
          <span class="flex-shrink-0 w-4"></span>
          <span class="text-text-secondary">]</span>
        </div>
      </div>
    </template>

    <template v-else-if="node.type === 'object'">
      <div class="flex items-start py-0.5">
        <button
          @click="$emit('toggle', node.path)"
          class="p-0.5 text-text-muted hover:text-text-secondary transition-colors duration-fast flex-shrink-0"
        >
          <svg v-if="node.expanded" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <span class="text-text-secondary">{</span>
        <span v-if="!node.expanded && node.entries.length > 0" class="ml-2 text-text-muted">
          {{ node.entries.length }} keys...
        </span>
        <span v-if="!node.expanded">}</span>
      </div>
      
      <div v-if="node.expanded" class="ml-6">
        <div v-for="(entry, index) in node.entries" :key="entry.value.path" class="relative py-0.5">
          <div class="flex items-start">
            <span class="flex-shrink-0 w-4"></span>
            <span class="font-mono text-xs">
              <span
                :class="getNodeClass('key')"
                v-html="highlightText(quoteString(entry.key), searchQuery)"
              ></span>
              <span class="text-text-secondary">:</span>
            </span>
            <JsonNode
              :node="entry.value"
              :search-query="searchQuery"
              @toggle="$emit('toggle', $event)"
            />
            <span class="text-text-secondary">{{ index < node.entries.length - 1 ? ',' : '' }}</span>
          </div>
        </div>
        <div class="flex items-start py-0.5">
          <span class="flex-shrink-0 w-4"></span>
          <span class="text-text-secondary">}</span>
        </div>
      </div>
    </template>

    <template v-else-if="node.type === 'string'">
      <span
        class="font-mono text-xs"
        :class="getNodeClass('string')"
        v-html="highlightText(quoteString(node.value), searchQuery)"
      ></span>
    </template>

    <template v-else-if="node.type === 'number'">
      <span
        class="font-mono text-xs"
        :class="[getNodeClass('number'), { 'bg-accent-yellow/20 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
        v-html="highlightText(node.value, searchQuery)"
      ></span>
    </template>

    <template v-else-if="node.type === 'boolean'">
      <span
        class="font-mono text-xs"
        :class="[getNodeClass('boolean'), { 'bg-accent-yellow/20 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
        v-html="highlightText(node.value, searchQuery)"
      ></span>
    </template>

    <template v-else-if="node.type === 'null'">
      <span
        class="font-mono text-xs"
        :class="[getNodeClass('null'), { 'bg-accent-yellow/20 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
        v-html="highlightText(node.value, searchQuery)"
      ></span>
    </template>

    <template v-else>
      <span class="font-mono text-xs text-text-primary">{{ node.value }}</span>
    </template>
  </div>
</template>