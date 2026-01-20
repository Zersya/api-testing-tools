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

interface FolderWithRequestsAndChildren {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  requests: HttpRequest[];
  children: FolderWithRequestsAndChildren[];
}

interface CollectionWithFolders {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  authConfig: Record<string, unknown> | null;
  createdAt: Date;
  folders: FolderWithRequestsAndChildren[];
  folderCount: number;
  requestCount: number;
}

interface ProjectWithCollections {
  id: string;
  workspaceId: string;
  name: string;
  baseUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  collections: CollectionWithFolders[];
  collectionCount: number;
}

interface WorkspaceWithProjects {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  projects: ProjectWithCollections[];
  projectCount: number;
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
  collections?: Collection[];
  mocks?: Mock[];
  selectedMockId?: string | null;
  selectedCollectionId?: string | null;
  workspaces?: WorkspaceWithProjects[];
}

const props = withDefaults(defineProps<Props>(), {
  collections: () => [],
  mocks: () => [],
  selectedMockId: null,
  selectedCollectionId: null,
  workspaces: () => []
});

const emit = defineEmits<{
  selectMock: [mock: Mock];
  selectCollection: [collection: Collection];
  selectRequest: [request: HttpRequest];
  createMock: [collectionId?: string];
  createCollection: [];
  createResource: [];
  editCollection: [collection: Collection];
  deleteCollection: [collection: Collection];
  deleteGroup: [collectionId: string, groupName: string, mocks: Mock[]];
  createRequest: [folderId?: string];
  createFolder: [collectionId?: string];
  createProject: [workspaceId?: string];
  createWorkspace: [];
}>();

const selectedWorkspaceId = ref<string | null>(null);
const activeView = ref<'hierarchy' | 'mocks'>('mocks');
const contextMenu = ref<{ x: number; y: number; type: string; data: any } | null>(null);

const expandedCollections = ref<Set<string>>(new Set());
const expandedGroups = ref<Set<string>>(new Set());
const expandedWorkspaces = ref<Set<string>>(new Set());
const expandedProjects = ref<Set<string>>(new Set());
const expandedCollectionsHierarchy = ref<Set<string>>(new Set());
const expandedFolders = ref<Set<string>>(new Set());

const currentWorkspace = computed(() => {
  if (!selectedWorkspaceId.value) return props.workspaces[0];
  return props.workspaces.find(w => w.id === selectedWorkspaceId.value) || props.workspaces[0];
});

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

watch(() => props.workspaces, (newWorkspaces) => {
  if (newWorkspaces.length > 0 && !selectedWorkspaceId.value) {
    selectedWorkspaceId.value = newWorkspaces[0].id;
  }
}, { immediate: true });

watch(selectedWorkspaceId, (newId) => {
  if (newId && currentWorkspace.value) {
    expandedWorkspaces.value.add(newId);
    expandedProjects.value.add(currentWorkspace.value.projects[0]?.id);
  }
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

  if (props.workspaces.length > 0) {
    selectedWorkspaceId.value = props.workspaces[0].id;
    expandedWorkspaces.value.add(props.workspaces[0].id);
    if (props.workspaces[0].projects.length > 0) {
      expandedProjects.value.add(props.workspaces[0].projects[0].id);
    }
  }
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

const toggleWorkspace = (workspaceId: string) => {
  if (expandedWorkspaces.value.has(workspaceId)) {
    expandedWorkspaces.value.delete(workspaceId);
  } else {
    expandedWorkspaces.value.add(workspaceId);
  }
};

const toggleProject = (projectId: string) => {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId);
  } else {
    expandedProjects.value.add(projectId);
  }
};

const toggleCollectionHierarchy = (collectionId: string) => {
  if (expandedCollectionsHierarchy.value.has(collectionId)) {
    expandedCollectionsHierarchy.value.delete(collectionId);
  } else {
    expandedCollectionsHierarchy.value.add(collectionId);
  }
};

const toggleFolder = (folderId: string) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId);
  } else {
    expandedFolders.value.add(folderId);
  }
};

const isCollectionExpanded = (collectionId: string) => expandedCollections.value.has(collectionId);
const isGroupExpanded = (collectionId: string, groupName: string) => expandedGroups.value.has(`${collectionId}:${groupName}`);
const isWorkspaceExpanded = (workspaceId: string) => expandedWorkspaces.value.has(workspaceId);
const isProjectExpanded = (projectId: string) => expandedProjects.value.has(projectId);
const isCollectionHierarchyExpanded = (collectionId: string) => expandedCollectionsHierarchy.value.has(collectionId);
const isFolderExpanded = (folderId: string) => expandedFolders.value.has(folderId);

const getCollectionColor = (color: string) => {
  return { borderLeftColor: color };
};

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

const handleContextMenu = (event: MouseEvent, type: string, data: any) => {
  event.preventDefault();
  event.stopPropagation();
  contextMenu.value = { x: event.clientX, y: event.clientY, type, data };
};

const closeContextMenu = () => {
  contextMenu.value = null;
};

const handleContextAction = (action: string) => {
  if (!contextMenu.value) return;

  const { type, data } = contextMenu.value;

  switch (type) {
    case 'workspace':
      if (action === 'create-project') {
        emit('createProject', data.id);
      }
      break;
    case 'project':
      if (action === 'create-collection') {
        emit('createCollection');
      }
      break;
    case 'collection':
      if (action === 'create-folder') {
        emit('createFolder', data.id);
      }
      break;
    case 'folder':
      if (action === 'create-request') {
        emit('createRequest', data.id);
      }
      break;
  }

  closeContextMenu();
};

const getMethodIcon = (method: string) => {
  const icons: Record<string, string> = {
    GET: '●',
    POST: '◆',
    PUT: '■',
    PATCH: '▬',
    DELETE: '✕',
    HEAD: '○',
    OPTIONS: '≡'
  };
  return icons[method] || '?';
};

onMounted(() => {
  window.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu);
});
</script>

<template>
  <aside class="w-[300px] h-full bg-bg-sidebar border-r border-border-default flex flex-col flex-shrink-0">
    <!-- Main Navigation -->
    <div class="flex flex-col border-b border-border-default p-2 gap-1">
      <button
        :class="['flex items-center gap-2 py-2 px-3 rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-[13px] font-medium', activeView === 'hierarchy' ? 'bg-bg-active text-text-primary' : '']"
        @click="activeView = 'hierarchy'"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
        Workspace
      </button>
      <NuxtLink to="/admin" active-class="bg-bg-active text-text-primary" class="flex items-center gap-2 py-2 px-3 rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-[13px] font-medium no-underline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        Mocks
      </NuxtLink>
      <NuxtLink to="/admin/definitions" active-class="bg-bg-active text-text-primary" class="flex items-center gap-2 py-2 px-3 rounded text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors text-[13px] font-medium no-underline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        Definitions
      </NuxtLink>
    </div>

    <!-- Workspace Switcher -->
    <div v-if="activeView === 'hierarchy' && workspaces.length > 0" class="flex items-center justify-between py-3 px-3 border-b border-border-default">
      <div class="flex items-center gap-2 flex-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-secondary">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        </svg>
        <select
          v-model="selectedWorkspaceId"
          class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-[13px] font-medium focus:outline-none focus:border-accent-blue cursor-pointer"
        >
          <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
            {{ workspace.name }}
          </option>
        </select>
      </div>
      <button
        class="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-orange ml-2"
        @click="emit('createWorkspace')"
        title="New Workspace"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>

    <!-- Sidebar Header - Mock Mode -->
    <div v-if="activeView === 'mocks'" class="flex items-center justify-between py-3 px-3 border-b border-border-default">
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
          @click="emit('createResource')"
          title="New Resource (CRUD)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s 9-1.34 9-3V5"></path>
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
      <!-- Workspace Hierarchy View -->
      <div v-if="activeView === 'hierarchy' && currentWorkspace">
        <!-- Empty State -->
        <div v-if="currentWorkspace.projects.length === 0" class="flex flex-col items-center justify-center gap-3 py-10 px-5 text-text-muted text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          <p class="text-[13px] m-0">No projects yet</p>
          <button class="btn btn-sm btn-secondary" @click="emit('createProject', currentWorkspace.id)">Create First Project</button>
        </div>

        <!-- Projects -->
        <div v-for="project in currentWorkspace.projects" :key="project.id">
          <!-- Project Header -->
          <div
            class="flex items-center gap-2 py-2.5 px-3 text-text-primary text-[13px] font-semibold cursor-pointer transition-colors duration-fast hover:bg-bg-hover group"
            @click="toggleProject(project.id)"
            @contextmenu.prevent="handleContextMenu($event, 'project', project)"
          >
            <!-- Chevron -->
            <svg
              :class="['text-text-muted transition-transform duration-fast', { 'rotate-90': isProjectExpanded(project.id) }]"
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>

            <!-- Project Icon -->
            <div class="flex items-center justify-center w-6 h-6 rounded-md bg-accent-blue/20 text-accent-blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>

            <!-- Name -->
            <span class="flex-1">{{ project.name }}</span>

            <!-- Count Badge -->
            <span class="text-[11px] font-medium text-text-muted bg-bg-tertiary py-0.5 px-2 rounded-full">
              {{ project.collectionCount }}
            </span>

            <!-- Add collection button -->
            <button
              class="flex items-center justify-center w-[22px] h-[22px] bg-transparent border-none rounded text-text-secondary cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-fast hover:bg-bg-hover hover:text-accent-green"
              @click.stop="emit('createCollection')"
              title="Add Collection"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <!-- Project Content (Collections) -->
          <Transition name="expand">
            <div v-show="isProjectExpanded(project.id)" class="pl-4">
              <!-- Empty Project -->
              <div v-if="project.collections.length === 0" class="py-3 px-4 text-xs text-text-muted italic">
                No collections in this project
              </div>

              <!-- Collections -->
              <div v-for="collection in project.collections" :key="collection.id" class="mb-0.5">
                <!-- Collection Header -->
                <div
                  class="flex items-center gap-2 py-2 px-3 text-text-primary text-xs font-medium cursor-pointer transition-colors duration-fast hover:bg-bg-hover group/groupitem"
                  :class="{ 'border-l-[2px] border-l-accent-blue': isCollectionHierarchyExpanded(collection.id) }"
                  @click="toggleCollectionHierarchy(collection.id)"
                  @contextmenu.prevent="handleContextMenu($event, 'collection', collection)"
                >
                  <!-- Chevron -->
                  <svg
                    :class="['text-text-muted transition-transform duration-fast', { 'rotate-90': isCollectionHierarchyExpanded(collection.id) }]"
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>

                  <!-- Collection Icon -->
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>

                  <!-- Name -->
                  <span class="flex-1">{{ collection.name }}</span>

                  <!-- Count -->
                  <span class="text-[10px] text-text-muted bg-bg-tertiary py-px px-1.5 rounded-lg mr-1.5">
                    {{ collection.requestCount }}
                  </span>

                  <!-- Add folder button -->
                  <button
                    class="flex items-center justify-center w-[18px] h-[18px] bg-transparent border-none rounded text-text-secondary cursor-pointer opacity-0 group-hover/groupitem:opacity-100 transition-all duration-fast hover:bg-bg-hover hover:text-accent-green"
                    @click.stop="emit('createFolder', collection.id)"
                    title="Add Folder"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </button>
                </div>

                <!-- Collection Content (Folders) -->
                <Transition name="expand">
                  <div v-show="isCollectionHierarchyExpanded(collection.id)" class="pl-3">
                    <!-- Folders Tree -->
                    <template v-for="folder in collection.folders" :key="folder.id">
                      <FolderTreeItem
                        :folder="folder"
                        :expanded-folder-ids="expandedFolders"
                        @toggle-folder="toggleFolder"
                        @select-request="emit('selectRequest', $event)"
                        @context-menu="handleContextMenu"
                        @create-request="emit('createRequest', $event)"
                      />
                    </template>

                    <!-- Empty Collection -->
                    <div v-if="collection.folders.length === 0" class="py-3 px-5 text-xs text-text-muted italic pl-4">
                      No folders in this collection
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </Transition>
        </div>
      </div>

        <!-- Mocks/Collections View -->
      <div v-if="activeView === 'mocks'">
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
                class="flex items-center gap-1.5 py-1.5 px-3 text-text-primary text-xs font-medium cursor-pointer transition-colors duration-fast hover:bg-bg-hover group/groupitem"
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
                <span class="text-[10px] text-text-muted bg-bg-tertiary py-px px-1.5 rounded-lg mr-1.5">
                  {{ group.items.length }}
                </span>

                <!-- Delete Group -->
                 <button 
                  class="flex items-center justify-center w-[18px] h-[18px] bg-transparent border-none rounded text-text-secondary cursor-pointer opacity-0 group-hover/groupitem:opacity-100 transition-all duration-fast hover:bg-accent-red/15 hover:text-accent-red"
                  @click.stop="emit('deleteGroup', collection.id, group.name, group.items)"
                  title="Delete Folder"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
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
      </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenu"
        class="fixed z-50 bg-bg-secondary border border-border-default rounded-lg shadow-lg min-w-[180px]"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click="closeContextMenu"
      >
        <div class="py-1">
          <template v-if="contextMenu.type === 'project'">
            <button
              class="flex items-center w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              @click.stop="handleContextAction('create-collection')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
              </svg>
              New Collection
            </button>
          </template>
          <template v-if="contextMenu.type === 'collection'">
            <button
              class="flex items-center w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              @click.stop="handleContextAction('create-folder')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <line x1="12" y1="11" x2="12" y2="17"></line>
                <line x1="9" y1="14" x2="15" y2="14"></line>
              </svg>
              New Folder
            </button>
          </template>
          <template v-if="contextMenu.type === 'folder'">
            <button
              class="flex items-center w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
              @click.stop="handleContextAction('create-request')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Request
            </button>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Click outside to close context menu -->
    <div
      v-if="contextMenu"
      class="fixed inset-0 z-40"
      @click="closeContextMenu"
    ></div>
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
