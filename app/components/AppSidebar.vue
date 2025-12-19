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
  <aside class="sidebar">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
      <div class="sidebar-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Collections</span>
      </div>
      <div class="sidebar-actions">
        <button class="sidebar-action-btn" @click="emit('createMock')" title="New Mock">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button class="sidebar-action-btn" @click="emit('createCollection')" title="New Collection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Tree View -->
    <div class="sidebar-tree">
      <div v-if="collectionsWithGroups.length === 0" class="sidebar-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No collections yet</p>
        <button class="btn btn-sm btn-secondary" @click="emit('createMock')">Create First Mock</button>
      </div>

      <!-- Collections -->
      <div v-for="collection in collectionsWithGroups" :key="collection.id" class="tree-collection">
        <!-- Collection Header -->
        <div 
          class="tree-collection-header" 
          :style="getCollectionColor(collection.color)"
          @click="toggleCollection(collection.id)"
        >
          <svg 
            :class="['folder-chevron', { 'expanded': isCollectionExpanded(collection.id) }]"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <div class="collection-icon" :style="{ backgroundColor: collection.color + '20', color: collection.color }">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <span class="collection-name">{{ collection.name }}</span>
          <span class="collection-count">{{ collection.mockCount }}</span>
          
          <!-- Collection Actions (only for non-root) -->
          <div v-if="collection.name !== 'root'" class="collection-actions" @click.stop>
            <button class="collection-action-btn" @click="emit('editCollection', collection)" title="Edit Collection">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
            <button class="collection-action-btn collection-action-btn--danger" @click="emit('deleteCollection', collection)" title="Delete Collection">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>

          <!-- Add mock to collection button -->
          <button class="collection-add-btn" @click.stop="emit('createMock', collection.id)" title="Add Mock to Collection">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <!-- Collection Content (Groups) -->
        <Transition name="expand">
          <div v-show="isCollectionExpanded(collection.id)" class="tree-collection-content">
            <div v-if="collection.groups.length === 0" class="collection-empty">
              <span>No mocks in this collection</span>
            </div>
            
            <div v-for="group in collection.groups" :key="`${collection.id}:${group.name}`" class="tree-group">
              <!-- Group Header (Folder) -->
              <div class="tree-folder" @click="toggleGroup(collection.id, group.name)">
                <svg 
                  :class="['folder-chevron', { 'expanded': isGroupExpanded(collection.id, group.name) }]"
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span class="folder-name">{{ group.name }}</span>
                <span class="folder-count">{{ group.items.length }}</span>
              </div>

              <!-- Group Items (Endpoints) -->
              <Transition name="expand">
                <div v-show="isGroupExpanded(collection.id, group.name)" class="tree-items">
                  <div 
                    v-for="mock in group.items" 
                    :key="mock.id"
                    :class="['tree-item', { 'active': selectedMockId === mock.id }]"
                    @click="emit('selectMock', mock)"
                  >
                    <MethodBadge :method="mock.method" size="sm" />
                    <span class="item-path truncate">{{ mock.path }}</span>
                    <span v-if="mock.secure" class="item-lock" title="Protected">
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
.sidebar {
  width: 300px;
  height: 100%;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.sidebar-actions {
  display: flex;
  gap: 4px;
}

.sidebar-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
}

.sidebar-action-btn:hover {
  background-color: var(--bg-hover);
  color: var(--accent-orange);
}

.sidebar-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: var(--text-muted);
  text-align: center;
}

.sidebar-empty p {
  font-size: 13px;
  margin: 0;
}

/* Collection Styles */
.tree-collection {
  margin-bottom: 4px;
}

.tree-collection-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease;
  border-left: 3px solid transparent;
}

.tree-collection-header:hover {
  background-color: var(--bg-hover);
}

.tree-collection-header:hover .collection-actions,
.tree-collection-header:hover .collection-add-btn {
  opacity: 1;
}

.collection-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
}

.collection-name {
  flex: 1;
}

.collection-count {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background-color: var(--bg-tertiary);
  padding: 2px 8px;
  border-radius: 10px;
}

.collection-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.collection-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
}

.collection-action-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.collection-action-btn--danger:hover {
  background-color: rgba(239, 83, 80, 0.15);
  color: var(--accent-red);
}

.collection-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  opacity: 0;
  transition: all 150ms ease;
}

.collection-add-btn:hover {
  background-color: var(--bg-hover);
  color: var(--accent-green);
}

.tree-collection-content {
  padding-left: 16px;
}

.collection-empty {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}

/* Group Styles */
.tree-group {
  margin-bottom: 2px;
}

.tree-folder {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.tree-folder:hover {
  background-color: var(--bg-hover);
}

.folder-chevron {
  color: var(--text-muted);
  transition: transform 150ms ease;
}

.folder-chevron.expanded {
  transform: rotate(90deg);
}

.folder-name {
  flex: 1;
}

.folder-count {
  font-size: 10px;
  color: var(--text-muted);
  background-color: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 8px;
}

.tree-items {
  padding-left: 16px;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  margin: 1px 8px;
  border-radius: 4px;
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: all 150ms ease;
}

.tree-item:hover {
  background-color: var(--bg-hover);
}

.tree-item.active {
  background-color: var(--bg-active);
  border-left-color: var(--accent-orange);
}

.item-path {
  flex: 1;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.tree-item.active .item-path {
  color: var(--text-primary);
}

.item-lock {
  color: var(--accent-orange);
}

/* Transition */
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
