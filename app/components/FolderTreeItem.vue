<script setup lang="ts">
interface HttpRequest {
  id: string;
  folderId: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | string | null;
  auth: {
    type: string;
    credentials?: Record<string, string>;
  } | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderTreeItemProps {
  folder: {
    id: string;
    collectionId: string;
    parentFolderId: string | null;
    name: string;
    order: number;
    requests: HttpRequest[];
    children: any[];
  };
  expandedFolderIds: Set<string>;
}

const props = defineProps<FolderTreeItemProps>();

const emit = defineEmits<{
  toggleFolder: [folderId: string];
  selectRequest: [request: HttpRequest];
  contextMenu: [event: MouseEvent, type: string, data: any];
  createRequest: [folderId?: string];
}>();

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: '#22c55e',
    POST: '#3b82f6',
    PUT: '#f97316',
    PATCH: '#eab308',
    DELETE: '#ef4444',
    HEAD: '#8b5cf6',
    OPTIONS: '#64748b'
  };
  return colors[method] || '#64748b';
};

const isExpanded = (folderId: string) => props.expandedFolderIds.has(folderId);
</script>

<template>
  <div class="mb-0.5">
    <!-- Folder Header -->
    <div
      class="flex items-center gap-1.5 py-1.5 px-3 text-text-primary text-xs font-medium cursor-pointer transition-colors duration-fast hover:bg-bg-hover group"
      @click="emit('toggleFolder', folder.id)"
      @contextmenu.prevent="emit('contextMenu', $event, 'folder', folder)"
    >
      <!-- Chevron -->
      <svg
        :class="['text-text-muted transition-transform duration-fast', { 'rotate-90': isExpanded(folder.id) }]"
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>

      <!-- Folder Icon -->
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>

      <!-- Name -->
      <span class="flex-1">{{ folder.name }}</span>

      <!-- Count -->
      <span class="text-[10px] text-text-muted bg-bg-tertiary py-px px-1.5 rounded-lg mr-1.5">
        {{ folder.requests.length }}
      </span>

      <!-- Add request button -->
      <button
        class="flex items-center justify-center w-[18px] h-[18px] bg-transparent border-none rounded text-text-secondary cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-fast hover:bg-bg-hover hover:text-accent-green"
        @click.stop="emit('createRequest', folder.id)"
        title="Add Request"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- Folder Content (Nested Folders & Requests) -->
    <Transition name="expand">
      <div v-show="isExpanded(folder.id)" class="pl-3">
        <!-- Nested Folders -->
        <template v-for="childFolder in folder.children" :key="childFolder.id">
          <FolderTreeItem
            :folder="childFolder"
            :expanded-folder-ids="expandedFolderIds"
            @toggle-folder="emit('toggleFolder', $event)"
            @select-request="emit('selectRequest', $event)"
            @context-menu="emit('contextMenu', $event, 'folder', $event)"
            @create-request="emit('createRequest', $event)"
          />
        </template>

        <!-- Requests -->
        <div v-if="folder.requests.length > 0" class="mt-1">
          <div
            v-for="request in folder.requests"
            :key="request.id"
            class="flex items-center gap-2 py-1.5 px-3 mx-2 my-px rounded cursor-pointer border-l-2 border-l-transparent transition-all duration-fast hover:bg-bg-hover"
            @click="emit('selectRequest', request)"
            @contextmenu.prevent="emit('contextMenu', $event, 'request', request)"
          >
            <span
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              :style="{ backgroundColor: getMethodColor(request.method) + '20', color: getMethodColor(request.method) }"
            >
              {{ request.method }}
            </span>
            <span class="flex-1 text-[11px] font-mono truncate text-text-secondary">
              {{ request.name }}
            </span>
          </div>
        </div>

        <!-- Empty Folder -->
        <div v-if="folder.children.length === 0 && folder.requests.length === 0" class="py-2 px-5 text-xs text-text-muted italic">
          Empty folder
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 200ms ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>