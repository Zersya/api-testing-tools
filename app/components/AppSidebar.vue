<script setup lang="ts">
interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
}

interface Mock {
  id: string;
  collection: string;
  path: string;
  method: string;
  status: number;
  response: any;
  delay: number;
  secure: boolean;
}

interface MockGroup {
  name: string;
  items: Mock[];
}

interface CollectionWithGroups extends Collection {
  groups: MockGroup[];
  mockCount: number;
}

interface Props {
  collections: Collection[];
  mocks: Mock[];
  selectedMockId?: string | null;
  selectedCollectionId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedMockId: null,
  selectedCollectionId: null
});

const emit = defineEmits<{
  selectMock: [mock: Mock];
  selectCollection: [collection: Collection];
  createMock: [collectionId?: string];
  createCollection: [];
  editCollection: [collection: Collection];
  deleteCollection: [collection: Collection];
}>();

const expandedCollections = ref<Set<string>>(new Set());
const expandedGroups = ref<Set<string>>(new Set());

// Build collections with their grouped mocks
const collectionsWithGroups = computed((): CollectionWithGroups[] => {
  return props.collections.map(collection => {
    const collectionMocks = props.mocks.filter(m => (m.collection || 'root') === collection.id);
    
    const groups: Record<string, Mock[]> = {};
    
    collectionMocks.forEach((mock) => {
      const parts = mock.path.split('/').filter(Boolean);
      let key = 'General';
      
      if (parts.length > 0) {
        if (parts[0] === 'api' && parts.length > 1) {
          key = parts[1];
        } else {
          key = parts[0];
        }
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(mock);
    });

    const sortedGroups = Object.entries(groups)
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.path.localeCompare(b.path))
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      ...collection,
      groups: sortedGroups,
      mockCount: collectionMocks.length
    };
  });
});

// Expand all collections by default
onMounted(() => {
  props.collections.forEach(c => {
    expandedCollections.value.add(c.id);
    // Also expand all groups within
    collectionsWithGroups.value.forEach(coll => {
      coll.groups.forEach(g => {
        expandedGroups.value.add(`${coll.id}:${g.name}`);
      });
    });
  });
});

watch(() => props.collections, (newCollections) => {
  newCollections.forEach(c => expandedCollections.value.add(c.id));
}, { deep: true });

watch(() => collectionsWithGroups.value, (newCollections) => {
  newCollections.forEach(coll => {
    coll.groups.forEach(g => {
      expandedGroups.value.add(`${coll.id}:${g.name}`);
    });
  });
}, { deep: true });

const toggleCollection = (collectionId: string) => {
  if (expandedCollections.value.has(collectionId)) {
    expandedCollections.value.delete(collectionId);
  } else {
    expandedCollections.value.add(collectionId);
  }
};

const toggleGroup = (collectionId: string, groupName: string) => {
  const key = `${collectionId}:${groupName}`;
  if (expandedGroups.value.has(key)) {
    expandedGroups.value.delete(key);
  } else {
    expandedGroups.value.add(key);
  }
};

const isCollectionExpanded = (collectionId: string) => expandedCollections.value.has(collectionId);
const isGroupExpanded = (collectionId: string, groupName: string) => expandedGroups.value.has(`${collectionId}:${groupName}`);

const getCollectionColor = (color: string) => {
  return { borderLeftColor: color };
};
</script>

<template>
  <aside class="w-[300px] h-full bg-bg-sidebar border-r border-border-default flex flex-col flex-shrink-0">
    <!-- Sidebar Header -->
    <div class="flex items-center justify-between py-3 px-3 border-b border-border-default">
      <div class="flex items-center gap-2 text-text-primary text-[13px] font-semibold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Collections</span>
      </div>
      <div class="flex gap-1">
        <button 
          class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-orange" 
          @click="emit('createMock')" 
          title="New Mock"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button 
          class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-orange" 
          @click="emit('createCollection')" 
          title="New Collection"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tree View -->
    <div class="flex-1 overflow-y-auto py-2">
      <!-- Empty State -->
      <div v-if="collectionsWithGroups.length === 0" class="flex flex-col items-center justify-center gap-3 py-10 px-5 text-text-muted text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p class="text-[13px] m-0">No collections yet</p>
        <button class="btn btn-sm btn-secondary" @click="emit('createMock')">Create First Mock</button>
      </div>

      <!-- Collections -->
      <div v-for="collection in collectionsWithGroups" :key="collection.id" class="mb-1">
        <!-- Collection Header -->
        <div 
          class="flex items-center gap-2 py-2.5 px-3 text-text-primary text-[13px] font-semibold cursor-pointer transition-colors duration-fast border-l-[3px] border-l-transparent hover:bg-bg-hover group" 
          :style="getCollectionColor(collection.color)"
          @click="toggleCollection(collection.id)"
        >
          <!-- Chevron -->
          <svg 
            :class="['text-text-muted transition-transform duration-fast', { 'rotate-90': isCollectionExpanded(collection.id) }]"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>

          <!-- Collection Icon -->
          <div 
            class="flex items-center justify-center w-6 h-6 rounded-md"
            :style="{ backgroundColor: collection.color + '20', color: collection.color }"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>

          <!-- Name -->
          <span class="flex-1">{{ collection.name }}</span>

          <!-- Count Badge -->
          <span class="text-[11px] font-medium text-text-muted bg-bg-tertiary py-0.5 px-2 rounded-full">
            {{ collection.mockCount }}
          </span>
          
          <!-- Collection Actions (only for non-root) -->
          <div v-if="collection.name !== 'root'" class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-fast" @click.stop>
            <button 
              class="flex items-center justify-center w-[22px] h-[22px] bg-transparent border-none rounded text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" 
              @click="emit('editCollection', collection)" 
              title="Edit Collection"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
            <button 
              class="flex items-center justify-center w-[22px] h-[22px] bg-transparent border-none rounded text-text-secondary cursor-pointer transition-all duration-fast hover:bg-accent-red/15 hover:text-accent-red" 
              @click="emit('deleteCollection', collection)" 
              title="Delete Collection"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>

          <!-- Add mock to collection button -->
          <button 
            class="flex items-center justify-center w-[22px] h-[22px] bg-transparent border-none rounded text-text-secondary cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-fast hover:bg-bg-hover hover:text-accent-green" 
            @click.stop="emit('createMock', collection.id)" 
            title="Add Mock to Collection"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <!-- Collection Content (Groups) -->
        <Transition name="expand">
          <div v-show="isCollectionExpanded(collection.id)" class="pl-4">
            <!-- Empty Collection -->
            <div v-if="collection.groups.length === 0" class="py-3 px-4 text-xs text-text-muted italic">
              No mocks in this collection
            </div>
            
            <!-- Groups -->
            <div v-for="group in collection.groups" :key="`${collection.id}:${group.name}`" class="mb-0.5">
              <!-- Group Header (Folder) -->
              <div 
                class="flex items-center gap-1.5 py-1.5 px-3 text-text-primary text-xs font-medium cursor-pointer transition-colors duration-fast hover:bg-bg-hover"
                @click="toggleGroup(collection.id, group.name)"
              >
                <!-- Chevron -->
                <svg 
                  :class="['text-text-muted transition-transform duration-fast', { 'rotate-90': isGroupExpanded(collection.id, group.name) }]"
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>

                <!-- Folder Icon -->
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>

                <!-- Name -->
                <span class="flex-1">{{ group.name }}</span>

                <!-- Count -->
                <span class="text-[10px] text-text-muted bg-bg-tertiary py-px px-1.5 rounded-lg">
                  {{ group.items.length }}
                </span>
              </div>

              <!-- Group Items (Endpoints) -->
              <Transition name="expand">
                <div v-show="isGroupExpanded(collection.id, group.name)" class="pl-4">
                  <div 
                    v-for="mock in group.items" 
                    :key="mock.id"
                    :class="[
                      'flex items-center gap-2 py-1.5 px-3 mx-2 my-px rounded cursor-pointer border-l-2 border-l-transparent transition-all duration-fast hover:bg-bg-hover',
                      selectedMockId === mock.id ? 'bg-bg-active border-l-accent-orange' : ''
                    ]"
                    @click="emit('selectMock', mock)"
                  >
                    <MethodBadge :method="mock.method" size="sm" />
                    <span 
                      :class="[
                        'flex-1 text-[11px] font-mono truncate',
                        selectedMockId === mock.id ? 'text-text-primary' : 'text-text-secondary'
                      ]"
                    >
                      {{ mock.path }}
                    </span>
                    <span v-if="mock.secure" class="text-accent-orange" title="Protected">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Transitions - kept for Vue transition support */
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
