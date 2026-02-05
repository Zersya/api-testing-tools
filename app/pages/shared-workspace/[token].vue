<script setup lang="ts">
import RequestBuilder from '~/components/RequestBuilder.vue';
import MethodBadge from '~/components/MethodBadge.vue';
import FolderTreeItem from '~/components/FolderTreeItem.vue';

definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const token = computed(() => route.params.token as string);

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

interface FolderWithRequests {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  requests: HttpRequest[];
  children: FolderWithRequests[];
}

interface Collection {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  folders: FolderWithRequests[];
  folderCount: number;
  requestCount: number;
}

interface Project {
  id: string;
  workspaceId: string;
  name: string;
  baseUrl: string | null;
  collections: Collection[];
  collectionCount: number;
}

interface SharedWorkspace {
  id: string;
  name: string;
  projects: Project[];
  projectCount: number;
  permission: 'view' | 'edit';
  isShared: boolean;
}

const { data: workspace, error, refresh } = await useFetch<SharedWorkspace>(`/api/shared-workspace/${token.value}`);

if (error.value) {
  if (error.value.statusCode === 401) {
    await navigateTo('/login');
  }
}

// Current selected request
const selectedRequest = ref<HttpRequest | null>(null);
const selectedFolderId = ref<string | null>(null);

// Expanded states
const expandedCollections = ref<Set<string>>(new Set());
const expandedFolders = ref<Set<string>>(new Set());
const expandedProjects = ref<Set<string>>(new Set());

// Auto-expand first project and collection
watch(workspace, (ws) => {
  if (ws?.projects?.length) {
    expandedProjects.value.add(ws.projects[0].id);
    if (ws.projects[0].collections?.length) {
      expandedCollections.value.add(ws.projects[0].collections[0].id);
    }
  }
}, { immediate: true });

const toggleProject = (projectId: string) => {
  if (expandedProjects.value.has(projectId)) {
    expandedProjects.value.delete(projectId);
  } else {
    expandedProjects.value.add(projectId);
  }
};

const toggleCollection = (collectionId: string) => {
  if (expandedCollections.value.has(collectionId)) {
    expandedCollections.value.delete(collectionId);
  } else {
    expandedCollections.value.add(collectionId);
  }
};

const toggleFolder = (folderId: string) => {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId);
  } else {
    expandedFolders.value.add(folderId);
  }
};

const selectRequest = (request: HttpRequest) => {
  selectedRequest.value = request;
  selectedFolderId.value = request.folderId;
};

const canEdit = computed(() => workspace.value?.permission === 'edit');

const handleRequestSave = async () => {
  await refresh();
};

const goBack = () => {
  navigateTo('/admin');
};
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-bg-primary">
    <!-- Header -->
    <header class="flex items-center justify-between h-12 px-4 border-b border-border-default bg-bg-sidebar flex-shrink-0">
      <div class="flex items-center gap-3">
        <button 
          @click="goBack"
          class="flex items-center justify-center w-8 h-8 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
          title="Back to workspaces"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        
        <div class="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-blue">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="text-sm font-semibold text-text-primary">{{ workspace?.name || 'Shared Workspace' }}</span>
        </div>
        
        <!-- Permission Badge -->
        <span :class="[
          'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
          workspace?.permission === 'edit' 
            ? 'bg-accent-orange/15 text-accent-orange' 
            : 'bg-accent-blue/15 text-accent-blue'
        ]">
          {{ workspace?.permission === 'edit' ? 'Editor' : 'Viewer' }}
        </span>
        
        <span class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-accent-purple/15 text-accent-purple">
          Shared
        </span>
      </div>
    </header>

    <!-- Error State -->
    <div v-if="error" class="flex-1 flex flex-col items-center justify-center p-8">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-accent-red opacity-50 mb-4">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Unable to access workspace</h2>
      <p class="text-text-secondary text-center max-w-md mb-4">
        {{ error.data?.message || error.message || 'This share link may be invalid, expired, or revoked.' }}
      </p>
      <button class="btn btn-primary" @click="goBack">
        Go to My Workspaces
      </button>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside class="w-[300px] bg-bg-sidebar border-r border-border-default flex flex-col flex-shrink-0">
        <div class="flex-1 overflow-y-auto p-2">
          <!-- Projects -->
          <div v-for="project in workspace?.projects" :key="project.id" class="mb-2">
            <div 
              class="flex items-center gap-2 py-2 px-2 rounded cursor-pointer hover:bg-bg-hover text-text-secondary"
              @click="toggleProject(project.id)"
            >
              <svg 
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                :class="['transition-transform', expandedProjects.has(project.id) ? 'rotate-90' : '']"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
              <span class="text-xs font-medium truncate">{{ project.name }}</span>
            </div>
            
            <!-- Collections -->
            <div v-if="expandedProjects.has(project.id)" class="ml-4">
              <div v-for="collection in project.collections" :key="collection.id" class="mb-1">
                <div 
                  class="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-bg-hover text-text-secondary"
                  @click="toggleCollection(collection.id)"
                >
                  <svg 
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    :class="['transition-transform', expandedCollections.has(collection.id) ? 'rotate-90' : '']"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span class="text-[11px] font-medium truncate">{{ collection.name }}</span>
                  <span class="text-[9px] text-text-muted ml-auto">{{ collection.requestCount }}</span>
                </div>
                
                <!-- Folders -->
                <div v-if="expandedCollections.has(collection.id)" class="ml-4">
                  <template v-for="folder in collection.folders" :key="folder.id">
                    <FolderTreeItem
                      :folder="folder"
                      :expanded-folders="expandedFolders"
                      :selected-request-id="selectedRequest?.id"
                      :permission="workspace?.permission || 'view'"
                      @toggle-folder="toggleFolder"
                      @select-request="selectRequest"
                    />
                  </template>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-if="!workspace?.projects?.length" class="flex flex-col items-center justify-center py-12 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted opacity-30 mb-3">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <p class="text-sm text-text-muted m-0">No projects in this workspace</p>
          </div>
        </div>
      </aside>

      <!-- Main Area -->
      <main class="flex-1 flex flex-col overflow-hidden bg-bg-primary">
        <div v-if="selectedRequest" class="flex-1 overflow-auto">
          <RequestBuilder
            :initial-request="selectedRequest"
            :can-edit="canEdit"
            :is-shared="true"
            :share-token="token"
            @saved="handleRequestSave"
          />
        </div>
        
        <div v-else class="flex-1 flex flex-col items-center justify-center text-center p-8">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted opacity-30 mb-4">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2 class="text-lg font-semibold text-text-primary mb-2">Select a request</h2>
          <p class="text-sm text-text-muted max-w-md">
            Choose a request from the sidebar to view or {{ canEdit ? 'edit' : 'inspect' }} it.
          </p>
        </div>
      </main>
    </div>
  </div>
</template>
