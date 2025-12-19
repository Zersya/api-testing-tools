<script setup lang="ts">
interface MockGroup {
  name: string;
  items: any[];
}

interface Props {
  groups: MockGroup[];
  selectedMockId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedMockId: null
});

const emit = defineEmits<{
  selectMock: [mock: any];
  createMock: [];
  createResource: [];
}>();

const expandedGroups = ref<Set<string>>(new Set());

// Expand all groups by default
onMounted(() => {
  props.groups.forEach(g => expandedGroups.value.add(g.name));
});

watch(() => props.groups, (newGroups) => {
  newGroups.forEach(g => expandedGroups.value.add(g.name));
});

const toggleGroup = (groupName: string) => {
  if (expandedGroups.value.has(groupName)) {
    expandedGroups.value.delete(groupName);
  } else {
    expandedGroups.value.add(groupName);
  }
};

const isExpanded = (groupName: string) => expandedGroups.value.has(groupName);
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
        <button class="sidebar-action-btn" @click="emit('createResource')" title="New Resource">
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
      <div v-if="groups.length === 0" class="sidebar-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>No collections yet</p>
        <button class="btn btn-sm btn-secondary" @click="emit('createMock')">Create First Mock</button>
      </div>

      <div v-for="group in groups" :key="group.name" class="tree-group">
        <!-- Group Header (Folder) -->
        <div class="tree-folder" @click="toggleGroup(group.name)">
          <svg 
            :class="['folder-chevron', { 'expanded': isExpanded(group.name) }]"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="folder-name">{{ group.name }}</span>
          <span class="folder-count">{{ group.items.length }}</span>
        </div>

        <!-- Group Items (Endpoints) -->
        <Transition name="expand">
          <div v-show="isExpanded(group.name)" class="tree-items">
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
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
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

.tree-group {
  margin-bottom: 4px;
}

.tree-folder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 13px;
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
  font-size: 11px;
  color: var(--text-muted);
  background-color: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 10px;
}

.tree-items {
  padding-left: 20px;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin: 2px 8px;
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
  font-size: 12px;
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
  max-height: 1000px;
}
</style>
