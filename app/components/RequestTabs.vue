<script setup lang="ts">
interface HttpRequest {
  id: string;
  folderId: string | null;
  collectionId?: string | null;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | string | null;
  auth: {
    type: string;
    credentials?: Record<string, string>;
  } | null;
  mockConfig?: {
    isEnabled: boolean;
    statusCode: number;
    delay: number;
    responseBody: Record<string, unknown> | string | null;
    responseHeaders: Record<string, string>;
  } | null;
  preScript?: string | null;
  postScript?: string | null;
  pathVariables?: Record<string, { value: string; description?: string }> | null;
  bodyFormat?: 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary';
  jsonBody?: string;
  rawBody?: string;
  rawContentType?: string;
  formDataParams?: Array<{
    key: string;
    value: string;
    enabled: boolean;
    type: 'text' | 'file';
  }>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpenTab {
  request: HttpRequest;
  hasUnsavedChanges: boolean;
  key: string;
}

interface Props {
  openTabs: OpenTab[];
  activeTabKey: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  selectTab: [key: string];
  closeTab: [key: string];
  newTab: [];
  reorderTabs: [fromIndex: number, toIndex: number];
}>();

const draggedIndex = ref<number | null>(null);

const methodColors: Record<string, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f97316',
  PATCH: '#eab308',
  DELETE: '#ef4444',
  HEAD: '#8b5cf6',
  OPTIONS: '#64748b'
};

const handleTabClick = (key: string) => {
  emit('selectTab', key);
};

const handleCloseTab = (event: Event, key: string) => {
  event.stopPropagation();
  emit('closeTab', key);
};

const handleMiddleClick = (event: MouseEvent, key: string) => {
  if (event.button === 1) {
    event.preventDefault();
    emit('closeTab', key);
  }
};

const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'move';
};

const handleDrop = (event: DragEvent, toIndex: number) => {
  event.preventDefault();
  if (draggedIndex.value === null) return;
  
  const fromIndex = draggedIndex.value;
  if (fromIndex === toIndex) return;
  
  emit('reorderTabs', fromIndex, toIndex);
  draggedIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
};
</script>

<template>
  <div class="flex items-center gap-1 border-b border-border-default bg-bg-secondary overflow-x-auto">
    <button
      v-for="(tab, index) in openTabs"
      :key="tab.key"
      :draggable="true"
      @click="handleTabClick(tab.key)"
      @mouseup="handleMiddleClick($event, tab.key)"
      @dragstart="handleDragStart($event, index)"
      @dragover="handleDragOver"
      @drop="handleDrop($event, index)"
      @dragend="handleDragEnd"
      :class="[
        'group flex items-center gap-2 py-2 px-3 rounded-t border-t border-x border-b-0 text-xs font-medium cursor-pointer transition-all duration-fast whitespace-nowrap select-none min-w-[140px] max-w-[200px]',
        activeTabKey === tab.key
          ? 'bg-bg-primary border-accent-blue text-text-primary'
          : 'bg-bg-secondary border-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      ]"
    >
      <span
        :class="['font-bold uppercase text-[10px] w-5 text-center']"
        :style="{ color: methodColors[tab.request.method] }"
      >
        {{ tab.request.method }}
      </span>
      
      <span class="flex-1 truncate text-[12px]">
        {{ tab.request.name || 'Untitled' }}
      </span>
      
      <span
        v-if="tab.hasUnsavedChanges"
        class="w-1.5 h-1.5 rounded-full bg-accent-orange flex-shrink-0"
        title="Unsaved changes"
      ></span>
      
       <span
         @click="handleCloseTab($event, tab.key)"
         @keydown.enter="handleCloseTab($event, tab.key)"
         @keydown.space="handleCloseTab($event, tab.key)"
         role="button"
         tabindex="0"
         class="flex items-center justify-center w-4 h-4 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-fast hover:bg-bg-tertiary flex-shrink-0 cursor-pointer"
         title="Close tab"
       >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
       </span>
    </button>

    <button
      @click="emit('newTab')"
      class="flex items-center justify-center w-8 h-8 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all duration-fast flex-shrink-0"
      title="New tab"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  </div>
</template>