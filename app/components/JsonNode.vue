<script setup lang="ts">
interface Props {
  node: any;
  searchQuery: string;
  showComma?: boolean;
  keyLabel?: string;
}

withDefaults(defineProps<Props>(), {
  showComma: false,
  keyLabel: undefined
});

defineEmits<{
  toggle: [path: string];
}>();

const getNodeClass = (type: string) => {
  switch (type) {
    case 'string':  return 'text-accent-green';
    case 'number':  return 'text-accent-orange';
    case 'boolean': return 'text-accent-purple';
    case 'null':    return 'text-accent-red';
    case 'key':     return 'text-accent-blue';
    default:        return 'text-text-primary';
  }
};

const isHighlighted = (value: string, query: string) => {
  if (!query) return false;
  return value.toLowerCase().includes(query.toLowerCase());
};

const highlightText = (text: string, query: string): string => {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark class="bg-accent-yellow/60 text-text-primary px-0.5 rounded">$1</mark>');
};

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const quoteString = (value: string): string => {
  return `"${value.replace(/"/g, '\\"')}"`;
};
</script>

<template>
  <div v-if="node" class="json-node font-mono text-xs">

    <!-- ── ARRAY ─────────────────────────────────────────────── -->
    <template v-if="node.type === 'array'">
      <!-- Header line: [toggle] ["key": ] [ -->
      <div class="flex items-center leading-5">
        <button
          @click="$emit('toggle', node.path)"
          class="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1 text-text-muted hover:text-text-secondary transition-colors duration-fast"
        >
          <svg v-if="node.expanded" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <template v-if="keyLabel !== undefined">
          <span :class="getNodeClass('key')" v-html="highlightText(quoteString(keyLabel), searchQuery)"></span>
          <span class="text-text-secondary">:&nbsp;</span>
        </template>
        <span class="text-text-secondary">[</span>
        <template v-if="!node.expanded">
          <span v-if="node.length > 0" class="mx-1 text-text-muted text-[11px]">{{ node.length }}</span>
          <span class="text-text-secondary">]<span v-if="showComma">,</span></span>
        </template>
      </div>

      <!-- Expanded children -->
      <div v-if="node.expanded" class="border-l border-border-default/30 ml-2 pl-3">
        <div v-for="(child, index) in node.children" :key="child.path" class="leading-5">
          <JsonNode
            :node="child"
            :search-query="searchQuery"
            :show-comma="index < node.children.length - 1"
            @toggle="$emit('toggle', $event)"
          />
        </div>
        <div class="leading-5">
          <span class="text-text-secondary">]<span v-if="showComma">,</span></span>
        </div>
      </div>
    </template>

    <!-- ── OBJECT ─────────────────────────────────────────────── -->
    <template v-else-if="node.type === 'object'">
      <!-- Header line: [toggle] ["key": ] { -->
      <div class="flex items-center leading-5">
        <button
          @click="$emit('toggle', node.path)"
          class="w-4 h-4 flex items-center justify-center flex-shrink-0 mr-1 text-text-muted hover:text-text-secondary transition-colors duration-fast"
        >
          <svg v-if="node.expanded" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <template v-if="keyLabel !== undefined">
          <span :class="getNodeClass('key')" v-html="highlightText(quoteString(keyLabel), searchQuery)"></span>
          <span class="text-text-secondary">:&nbsp;</span>
        </template>
        <span class="text-text-secondary">{</span>
        <template v-if="!node.expanded">
          <span v-if="node.entries.length > 0" class="mx-1 text-text-muted text-[11px]">{{ node.entries.length }}</span>
          <span class="text-text-secondary">}<span v-if="showComma">,</span></span>
        </template>
      </div>

      <!-- Expanded entries -->
      <div v-if="node.expanded" class="border-l border-border-default/30 ml-2 pl-3">
        <div v-for="(entry, index) in node.entries" :key="entry.value.path" class="leading-5">
          <JsonNode
            :node="entry.value"
            :key-label="entry.key"
            :search-query="searchQuery"
            :show-comma="index < node.entries.length - 1"
            @toggle="$emit('toggle', $event)"
          />
        </div>
        <div class="leading-5">
          <span class="text-text-secondary">}<span v-if="showComma">,</span></span>
        </div>
      </div>
    </template>

    <!-- ── SCALAR (string / number / boolean / null / other) ─── -->
    <template v-else>
      <div class="flex items-center leading-5">
        <!-- Spacer aligns key text with object/array keys that have a toggle btn -->
        <span class="w-4 h-4 flex-shrink-0 mr-1"></span>

        <!-- Key label when inside an object -->
        <template v-if="keyLabel !== undefined">
          <span :class="getNodeClass('key')" v-html="highlightText(quoteString(keyLabel), searchQuery)"></span>
          <span class="text-text-secondary">:&nbsp;</span>
        </template>

        <!-- Value -->
        <span
          v-if="node.type === 'string'"
          :class="[getNodeClass('string'), { 'bg-accent-yellow/30 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
          class="break-all"
          v-html="highlightText(quoteString(node.value), searchQuery)"
        ></span>
        <span
          v-else-if="node.type === 'number'"
          :class="[getNodeClass('number'), { 'bg-accent-yellow/30 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
          v-html="highlightText(node.value, searchQuery)"
        ></span>
        <span
          v-else-if="node.type === 'boolean'"
          :class="[getNodeClass('boolean'), { 'bg-accent-yellow/30 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
          v-html="highlightText(node.value, searchQuery)"
        ></span>
        <span
          v-else-if="node.type === 'null'"
          :class="[getNodeClass('null'), { 'bg-accent-yellow/30 px-0.5 rounded': isHighlighted(node.value, searchQuery) }]"
          v-html="highlightText(node.value, searchQuery)"
        ></span>
        <span v-else class="text-text-primary">{{ node.value }}</span>

        <span v-if="showComma" class="text-text-secondary">,</span>
      </div>
    </template>

  </div>
</template>
