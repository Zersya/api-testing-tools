<script setup lang="ts">
import RequestBuilder from '~/components/RequestBuilder.vue';
import SaveRequestDialog from '~/components/SaveRequestDialog.vue';
import RequestTabs, { type OpenTab } from '~/components/RequestTabs.vue';
import ImportModal from '~/components/ImportModal.vue';
import MethodBadge from '~/components/MethodBadge.vue';
import ApiDocumentationViewer from '~/components/ApiDocumentationViewer.vue';
import ResponseComparison from '~/components/ResponseComparison.vue';
import KeyboardShortcutsHelpModal from '~/components/KeyboardShortcutsHelpModal.vue';
import RenameWorkspaceModal from '~/components/RenameWorkspaceModal.vue';
import { useKeyboardShortcuts } from '~/composables/useKeyboardShortcuts';
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

const { data: mocks, refresh: refreshMocks, error } = await useFetch<Mock[]>('/api/admin/mocks');
const { data: collections, refresh: refreshCollections } = await useFetch<Collection[]>('/api/admin/collections');
const { data: workspaces, refresh: refreshWorkspaces } = await useFetch<any[]>('/api/admin/tree');
const { data: definitions, refresh: refreshDefinitions } = await useFetch<any[]>('/api/definitions');

const currentWorkspaceId = computed(() => {
  return workspaces.value?.[0]?.id;
});

const currentProjectId = computed(() => {
  return workspaces.value?.[0]?.projects?.[0]?.id;
});

interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface Environment {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  variables: EnvironmentVariable[];
}

const { data: environments, refresh: refreshEnvironments } = await useFetch<Environment[]>(
  computed(() => `/api/admin/projects/${currentProjectId.value}/environments`),
  {
    immediate: true
  }
);

const activeEnvironment = computed(() => {
  return environments.value?.find(env => env.isActive) || null;
});

const activateEnvironment = async (environmentId: string | null) => {
  if (!environmentId) {
    return;
  }
  
  try {
    await $fetch(`/api/admin/environments/${environmentId}/activate`, { method: 'PUT' });
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error activating environment: ' + e.message);
  }
};

const findCollectionInWorkspaces = (collectionId: string): any => {
  if (!workspaces.value) return null;
  for (const workspace of workspaces.value) {
    for (const project of workspace.projects) {
      const collection = project.collections.find((c: any) => c.id === collectionId);
      if (collection) return collection;
    }
  }
  return null;
};

const findFolderInWorkspaces = (folderId: string): any => {
  if (!workspaces.value) return null;
  for (const workspace of workspaces.value) {
    for (const project of workspace.projects) {
      for (const collection of project.collections) {
        const findInFolder = (folders: any[]): any => {
          for (const folder of folders) {
            if (folder.id === folderId) return folder;
            if (folder.children?.length) {
              const found = findInFolder(folder.children);
              if (found) return found;
            }
          }
          return null;
        };
        const found = findInFolder(collection.folders);
        if (found) return found;
      }
    }
  }
  return null;
};

const findCollectionByFolderId = (folderId: string): { collectionId: string; folderId: string } | null => {
  if (!workspaces.value) return null;
  for (const workspace of workspaces.value) {
    for (const project of workspace.projects) {
      for (const collection of project.collections) {
        const findInFolder = (folders: any[]): string | null => {
          for (const folder of folders) {
            if (folder.id === folderId) return folder.id;
            if (folder.children?.length) {
              const found = findInFolder(folder.children);
              if (found) return found;
            }
          }
          return null;
        };
        const found = findInFolder(collection.folders);
        if (found) {
          return { collectionId: collection.id, folderId: found };
        }
      }
    }
  }
  return null;
};

const findFolderIdByRequestId = (requestId: string): string | null => {
  if (!workspaces.value) return null;
  for (const workspace of workspaces.value) {
    for (const project of workspace.projects) {
      for (const collection of project.collections) {
        const findInFolder = (folders: any[]): string | null => {
          for (const folder of folders) {
            if (folder.requests?.some((r: any) => r.id === requestId)) {
              return folder.id;
            }
            if (folder.children?.length) {
              const found = findInFolder(folder.children);
              if (found) return found;
            }
          }
          return null;
        };
        const found = findInFolder(collection.folders);
        if (found) return found;
      }
    }
  }
  return null;
};

if (error.value && error.value.statusCode === 401) {
    await navigateTo('/login');
}

// Modals
const showResourceModal = ref(false);
const showSettingsModal = ref(false);
const showPreviewModal = ref(false);
const showDeleteConfirm = ref(false);
const showCollectionModal = ref(false);
const showDeleteCollectionConfirm = ref(false);
const showDeleteGroupConfirm = ref(false);
const showSaveDialog = ref(false);
const showSaveAsDialog = ref(false);
const showImportModal = ref(false);
const definitionsRefreshTrigger = ref(0);
const showProjectModal = ref(false);
const projectWorkspaceId = ref<string | null>(null);
const showWorkspaceModal = ref(false);
const showRenameWorkspaceModal = ref(false);
const workspaceToRename = ref<{ id: string; name: string } | null>(null);
const selectedWorkspaceId = ref<string | null>(null);
const showFolderModal = ref(false);
const folderCollectionId = ref<string | null>(null);
const folderCollectionName = ref<string>('');
const showRequestModal = ref(false);
const requestFolderId = ref<string | null>(null);
const requestFolderName = ref<string>('');
const saveDialogDefaultCollectionId = ref('');
const saveDialogDefaultFolderId = ref('');

// State
const previewContent = ref('');
const selectedMock = ref<any>(null);
const selectedRequest = ref<HttpRequest | null>(null);
const mockToDelete = ref<any>(null);
const snippetLang = ref('curl');
const tryItLoading = ref(false);
const tryItResponse = ref<any>(null);
const tryItError = ref('');
const tryItTime = ref(0);
const selectedCollectionForNewMock = ref<string | null>(null);

// Tabs state
const openTabs = ref<OpenTab[]>([]);
const activeTabKey = ref<string | null>(null);

// Helper to create a new tab key
const createTabKey = () => `tab-${crypto.randomUUID()}`;

// Save dialog state
const requestToSave = ref<any>(null);
const requestToSaveAs = ref<any>(null);

const resourceForm = ref({
  name: '',
  basePath: '/api/',
  collection: 'root'
});

const settingsForm = ref({
    bearerToken: ''
});

// Collection modal state
const collectionModalMode = ref<'create' | 'edit'>('create');
const collectionForm = ref({
  id: '',
  projectId: '',
  name: '',
  description: '',
  color: '#6366f1'
});
const collectionToDelete = ref<Collection | null>(null);
const groupToDelete = ref<{ collectionId: string, name: string, mocks: Mock[] } | null>(null);

// Response comparison state
const showComparison = ref(false);
const comparisonLeft = ref<any>(null);
const comparisonRight = ref<any>(null);

interface RequestHistoryEntry {
  id: string;
  workspaceId: string;
  method: string;
  url: string;
  requestData: {
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
    auth?: any;
  } | null;
  responseData: {
    headers?: Record<string, string>;
    body?: any;
  } | null;
  statusCode: number | null;
  responseTimeMs: number | null;
  timestamp: Date;
}

const handleCompareResponses = (left: RequestHistoryEntry, right: RequestHistoryEntry) => {
  comparisonLeft.value = left;
  comparisonRight.value = right;
  showComparison.value = true;
};

const closeComparison = () => {
  showComparison.value = false;
  comparisonLeft.value = null;
  comparisonRight.value = null;
};

const collectionColors = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f97316', // Orange
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#64748b', // Slate
];

// Refresh all data
const refresh = () => {
  refreshMocks();
  refreshCollections();
  refreshWorkspaces();
  refreshDefinitions();
};

// Helper to build full API URL with collection prefix
const buildFullUrl = (mock: Mock) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const mockCollection = mock.collection || 'root';
    
    // Find collection name from ID
    const collection = collections.value?.find(c => c.id === mockCollection);
    const collectionName = collection?.name || 'root';
    
    // Root collection uses direct path, other collections use /c/{collection-name}/ prefix
    if (collectionName === 'root') {
        return `${origin}${mock.path}`;
    } else {
        return `${origin}/c/${collectionName}${mock.path}`;
    }
};

const getCollectionColor = (collectionId: string) => {
    if (collectionId === 'root') return '#64748b';
    const collection = collections.value?.find(c => c.id === collectionId);
    return collection?.color || '#6366f1';
};

// Code Snippets Generator
const codeSnippets = computed(() => {
    if (!selectedMock.value) return {};
    
    const mock = selectedMock.value;
    const url = buildFullUrl(mock);
    const authHeader = mock.secure ? `Authorization: Bearer YOUR_TOKEN` : '';
    
    return {
        curl: generateCurl(mock, url, authHeader),
        javascript: generateJavaScript(mock, url, authHeader),
        python: generatePython(mock, url, authHeader),
        php: generatePHP(mock, url, authHeader)
    };
});

const generateCurl = (mock: any, url: string, authHeader: string) => {
    let cmd = `curl -X ${mock.method} "${url}"`;
    if (authHeader) cmd += ` \\\n  -H "${authHeader}"`;
    if (['POST', 'PUT', 'PATCH'].includes(mock.method)) {
        cmd += ` \\\n  -H "Content-Type: application/json"`;
        cmd += ` \\\n  -d '{}'`;
    }
    return cmd;
};

const generateJavaScript = (mock: any, url: string, authHeader: string) => {
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(mock.method);
    let code = `const response = await fetch("${url}", {
  method: "${mock.method}",
  headers: {
    "Content-Type": "application/json"${authHeader ? `,\n    "Authorization": "Bearer YOUR_TOKEN"` : ''}
  }${hasBody ? `,
  body: JSON.stringify({})` : ''}
});

const data = await response.json();
console.log(data);`;
    return code;
};

const generatePython = (mock: any, url: string, authHeader: string) => {
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(mock.method);
    let code = `import requests

headers = {
    "Content-Type": "application/json"${authHeader ? `,
    "Authorization": "Bearer YOUR_TOKEN"` : ''}
}

response = requests.${mock.method.toLowerCase()}(
    "${url}",
    headers=headers${hasBody ? `,
    json={}` : ''}
)

print(response.json())`;
    return code;
};

const generatePHP = (mock: any, url: string, authHeader: string) => {
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(mock.method);
    let code = `<?php
$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => "${url}",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "${mock.method}",
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json"${authHeader ? `,
        "Authorization: Bearer YOUR_TOKEN"` : ''}
    ]${hasBody ? `,
    CURLOPT_POSTFIELDS => json_encode([])` : ''}
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`;
    return code;
};

const copySnippet = () => {
    const code = codeSnippets.value[snippetLang.value as keyof typeof codeSnippets.value];
    navigator.clipboard.writeText(code);
};

// Try It Feature
const sendTestRequest = async () => {
    if (!selectedMock.value) return;
    
    tryItLoading.value = true;
    tryItResponse.value = null;
    tryItError.value = '';
    
    const startTime = Date.now();
    
    try {
        const mock = selectedMock.value;
        const mockCollection = mock.collection || 'root';
        
        // Find collection name from ID
        const collection = collections.value?.find(c => c.id === mockCollection);
        const collectionName = collection?.name || 'root';
        
        // Build the correct path with collection prefix
        const requestPath = collectionName === 'root' ? mock.path : `/c/${collectionName}${mock.path}`;
        
        const response = await $fetch(requestPath, {
            method: mock.method,
            headers: mock.secure ? { 'Authorization': `Bearer ${settingsForm.value.bearerToken || 'test-token'}` } : {}
        });
        
        tryItTime.value = Date.now() - startTime;
        tryItResponse.value = response;
    } catch (e: any) {
        tryItTime.value = Date.now() - startTime;
        tryItError.value = e.message || 'Request failed';
        if (e.data) {
            tryItResponse.value = e.data;
        }
    } finally {
        tryItLoading.value = false;
    }
};

// Actions
const handleSelectMock = (mock: any) => {
    selectedMock.value = mock;
    selectedRequest.value = null;
    activeTabKey.value = null;
    tryItResponse.value = null;
    tryItError.value = '';
};

const createResource = async () => {
    if (!resourceForm.value.name) return;
    try {
        await $fetch('/api/admin/resource', {
            method: 'POST',
            body: {
                resourceName: resourceForm.value.name,
                basePath: resourceForm.value.basePath + resourceForm.value.name,
                collection: resourceForm.value.collection
            }
        });
        showResourceModal.value = false;
        resourceForm.value.name = '';
        resourceForm.value.collection = 'root';
        refresh();
    } catch (e: any) {
        alert('Error creating resource: ' + e.message);
    }
};

const confirmDeleteMock = (mock: any) => {
    mockToDelete.value = mock;
    showDeleteConfirm.value = true;
};

const deleteMock = async () => {
    if (!mockToDelete.value) return;
    await $fetch(`/api/admin/mocks?id=${mockToDelete.value.id}`, { method: 'DELETE' });
    if (selectedMock.value?.id === mockToDelete.value.id) {
        selectedMock.value = null;
    }
    showDeleteConfirm.value = false;
    mockToDelete.value = null;
    refresh();
};

const toggleSecure = async (mock: any) => {
    await $fetch('/api/admin/mocks', {
        method: 'PUT',
        body: { ...mock, secure: !mock.secure }
    });
    refresh();
    if (selectedMock.value?.id === mock.id) {
        selectedMock.value = { ...mock, secure: !mock.secure };
    }
};

const previewResponse = (response: any) => {
    previewContent.value = JSON.stringify(response, null, 2);
    showPreviewModal.value = true;
};

const openSettings = async () => {
    const data = await $fetch<any>('/api/admin/settings');
    settingsForm.value.bearerToken = data.bearerToken || '';
    showSettingsModal.value = true;
};

const saveSettings = async () => {
    await $fetch('/api/admin/settings', {
        method: 'POST',
        body: settingsForm.value
    });
    showSettingsModal.value = false;
};

const exportOpenAPI = async () => {
   const spec = await $fetch('/api/admin/export');
   const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'openapi.json';
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
};

const openImportModal = () => {
  showImportModal.value = true;
};

const copyPath = (mock: Mock) => {
    const url = buildFullUrl(mock);
    navigator.clipboard.writeText(url);
};

const duplicateMock = async (mock: any) => {
    try {
        await $fetch('/api/admin/mocks', {
            method: 'POST',
            body: {
                ...mock,
                id: undefined,
                path: mock.path + '-copy'
            }
        });
        refresh();
    } catch (e: any) {
        alert('Error duplicating mock: ' + e.message);
    }
};

const goToCreate = (collectionId?: string) => {
    if (collectionId) {
        navigateTo(`/admin/create?collection=${collectionId}`);
    } else {
        navigateTo('/admin/create');
    }
};

const goToEdit = (id: string) => {
    navigateTo(`/admin/${id}`);
};

// Request handlers
const handleSelectRequest = (request: HttpRequest) => {
  selectedMock.value = null;
  
  const existingTab = openTabs.value.find(tab => tab.request.id === request.id);
  if (existingTab) {
    activeTabKey.value = existingTab.key;
    selectedRequest.value = request;
  } else {
    const newTabKey = createTabKey();
    const newTab: OpenTab = {
      key: newTabKey,
      request: { ...request },
      hasUnsavedChanges: false
    };
    openTabs.value.push(newTab);
    activeTabKey.value = newTabKey;
    selectedRequest.value = newTab.request;
  }
};

// Tab handlers
const handleSelectTab = (tabKey: string) => {
  const tab = openTabs.value.find(t => t.key === tabKey);
  if (tab) {
    activeTabKey.value = tabKey;
    selectedRequest.value = tab.request;
    selectedMock.value = null;
  }
};

const handleCloseTab = (tabKey: string) => {
  const tabIndex = openTabs.value.findIndex(t => t.key === tabKey);
  if (tabIndex === -1) return;
  
  openTabs.value.splice(tabIndex, 1);
  
  // If closing the active tab, switch to another
  if (activeTabKey.value === tabKey) {
    if (openTabs.value.length > 0) {
      const newIndex = Math.min(tabIndex, openTabs.value.length - 1);
      activeTabKey.value = openTabs.value[newIndex].key;
      selectedRequest.value = openTabs.value[newIndex].request;
    } else {
      activeTabKey.value = null;
      selectedRequest.value = null;
    }
  }
};

const handleNewTab = () => {
  const newRequest: HttpRequest = {
    id: '',
    folderId: '',
    name: 'Untitled Request',
    method: 'GET',
    url: '',
    headers: null,
    body: null,
    auth: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const newTabKey = createTabKey();
  const newTab: OpenTab = {
    key: newTabKey,
    request: newRequest,
    hasUnsavedChanges: true
  };
  openTabs.value.push(newTab);
  activeTabKey.value = newTabKey;
  selectedRequest.value = newRequest;
};

const handleReorderTabs = (fromIndex: number, toIndex: number) => {
  const tab = openTabs.value.splice(fromIndex, 1)[0];
  openTabs.value.splice(toIndex, 0, tab);
};

const updateTabUnsavedStatus = (request: HttpRequest, hasUnsavedChanges: boolean) => {
  const tab = openTabs.value.find(t => t.key === activeTabKey.value);
  if (tab) {
  // Match either by ID (for saved requests) or by active tab (for new requests)
    const isMatchingRequest = request.id 
      ? tab.request.id === request.id 
      : true;
    
    if (isMatchingRequest) {
      tab.hasUnsavedChanges = hasUnsavedChanges;
      if (!hasUnsavedChanges) {
        tab.request = { ...request };
      }
    }
  }
};

const handleSaveRequest = async (request: any) => {
  requestToSave.value = request;
  
  // If request already has an ID (existing request), save directly without dialog
  if (request.id && request.id !== '') {
    try {
      await $fetch(`/api/admin/requests/${request.id}`, {
        method: 'PUT',
        body: {
          name: request.name,
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
          auth: request.auth
        }
      });
      
      // Update selectedRequest if it matches
      if (selectedRequest.value && selectedRequest.value.id === request.id) {
        selectedRequest.value = { ...request };
      }
      
      // Reset unsaved flag on the tab
      updateTabUnsavedStatus(request, false);
      
      return;
    } catch (e: any) {
      alert('Error saving request: ' + (e.data?.message || e.message));
      return;
    }
  }
  
  // For new requests, open the dialog with defaults
  let folderId = request.folderId;
  if (!folderId && request.id) {
    folderId = findFolderIdByRequestId(request.id);
  }
  
  if (folderId) {
    const parentInfo = findCollectionByFolderId(folderId);
    if (parentInfo) {
      saveDialogDefaultCollectionId.value = parentInfo.collectionId;
      saveDialogDefaultFolderId.value = parentInfo.folderId;
    } else {
      saveDialogDefaultCollectionId.value = '';
      saveDialogDefaultFolderId.value = '';
    }
  } else {
    saveDialogDefaultCollectionId.value = '';
    saveDialogDefaultFolderId.value = '';
  }
  
  showSaveDialog.value = true;
};

const handleSaveAsRequest = (request: any) => {
  requestToSaveAs.value = request;
  
  // Set defaults from current request's parent
  let folderId = request.folderId;
  if (!folderId && request.id) {
    folderId = findFolderIdByRequestId(request.id);
  }
  
  if (folderId) {
    const parentInfo = findCollectionByFolderId(folderId);
    if (parentInfo) {
      saveDialogDefaultCollectionId.value = parentInfo.collectionId;
      saveDialogDefaultFolderId.value = parentInfo.folderId;
    } else {
      saveDialogDefaultCollectionId.value = '';
      saveDialogDefaultFolderId.value = '';
    }
  } else {
    saveDialogDefaultCollectionId.value = '';
    saveDialogDefaultFolderId.value = '';
  }
  
  showSaveAsDialog.value = true;
};

const handleSave = async (data: any) => {
  if (!requestToSave.value) return;

  try {
    const isNewRequest = !requestToSave.value.id || requestToSave.value.id === '';
    
    // Check if we need to create a folder first
    let targetFolderId = data.folderId || '';
    
    if (data.isNewFolder && data.newFolderName) {
      const collectionIdToUse = data.collectionId || (workspaces.value?.[0]?.projects?.[0]?.collections?.[0]?.id);
      
      if (collectionIdToUse) {
        const newFolder = await $fetch(`/api/admin/collections/${collectionIdToUse}/folders`, {
          method: 'POST',
          body: {
            name: data.newFolderName.trim()
          }
        });
        targetFolderId = newFolder.id;
      }
    }

    if (isNewRequest) {
      // Create a new request
      const folderIdToUse = targetFolderId || (workspaces.value?.[0]?.projects?.[0]?.collections?.[0]?.folders?.[0]?.id);
      
      if (!folderIdToUse) {
        alert('Please select a folder first');
        return;
      }

      const newRequest = await $fetch(`/api/admin/folders/${folderIdToUse}/requests`, {
        method: 'POST',
        body: {
          name: data.name,
          method: requestToSave.value.method,
          url: requestToSave.value.url,
          headers: requestToSave.value.headers,
          body: requestToSave.value.body,
          auth: requestToSave.value.auth
        }
      });
      
      // Update the current tab with the new request data
      if (activeTabKey.value) {
        const tab = openTabs.value.find(t => t.key === activeTabKey.value);
        if (tab) {
          tab.request = newRequest;
          tab.hasUnsavedChanges = false;
          selectedRequest.value = newRequest;
        }
      }
    } else {
      // Update existing request
      await $fetch(`/api/admin/requests/${requestToSave.value.id}`, {
        method: 'PUT',
        body: {
          name: data.name,
          method: requestToSave.value.method,
          url: requestToSave.value.url,
          headers: requestToSave.value.headers,
          body: requestToSave.value.body,
          auth: requestToSave.value.auth
        }
      });

      // Also update selectedRequest if it matches
      if (selectedRequest.value && selectedRequest.value.id === requestToSave.value.id) {
        selectedRequest.value = {
          ...selectedRequest.value,
          name: data.name,
          method: requestToSave.value.method,
          url: requestToSave.value.url,
          headers: requestToSave.value.headers,
          body: requestToSave.value.body,
          auth: requestToSave.value.auth
        };
      }
      
      // Reset unsaved flag on the tab
      updateTabUnsavedStatus(requestToSave.value, false);
    }

    showSaveDialog.value = false;
    requestToSave.value = null;
    refresh();
  } catch (e: any) {
    alert('Error saving request: ' + (e.data?.message || e.message));
  }
};

const handleSaveAs = async (data: any) => {
  if (!requestToSaveAs.value) return;

  try {
    // Check if we need to create a folder first
    let targetFolderId = data.folderId || '';
    
    if (data.isNewFolder && data.newFolderName) {
      const collectionIdToUse = data.collectionId || (workspaces.value?.[0]?.projects?.[0]?.collections?.[0]?.id);
      
      if (collectionIdToUse) {
        const newFolder = await $fetch(`/api/admin/collections/${collectionIdToUse}/folders`, {
          method: 'POST',
          body: {
            name: data.newFolderName.trim()
          }
        });
        targetFolderId = newFolder.id;
      }
    }

    const folderIdToUse = targetFolderId || (workspaces.value?.[0]?.projects?.[0]?.collections?.[0]?.folders?.[0]?.id);
    
    if (!folderIdToUse) {
      alert('Please select a folder first');
      return;
    }

    const newRequest = await $fetch(`/api/admin/folders/${folderIdToUse}/requests`, {
      method: 'POST',
      body: {
        name: data.name,
        method: requestToSaveAs.value.method,
        url: requestToSaveAs.value.url,
        headers: requestToSaveAs.value.headers,
        body: requestToSaveAs.value.body,
        auth: requestToSaveAs.value.auth
      }
    });

    showSaveAsDialog.value = false;
    requestToSaveAs.value = null;
    refresh();

    // Select the newly created request (this creates a new tab)
    handleSelectRequest(newRequest);
    
    // Reset unsaved flag on the original tab's request
    if (activeTabKey.value) {
      const tab = openTabs.value.find(t => t.key === activeTabKey.value);
      if (tab) {
        tab.hasUnsavedChanges = false;
        tab.request = { ...requestToSaveAs.value };
      }
    }
  } catch (e: any) {
    alert('Error saving request as: ' + (e.data?.message || e.message));
  }
};

const openCreateRequest = (folderId?: string) => {
  if (folderId) {
    const folder = findFolderInWorkspaces(folderId);
    requestFolderId.value = folderId;
    requestFolderName.value = folder?.name || 'Unknown Folder';
    showRequestModal.value = true;
  } else {
    alert('Please select a folder first');
  }
};

const openCreateFolder = (collectionId?: string) => {
  if (collectionId) {
    const collection = findCollectionInWorkspaces(collectionId);
    folderCollectionId.value = collectionId;
    folderCollectionName.value = collection?.name || 'Unknown Collection';
    showFolderModal.value = true;
  } else {
    alert('Please select a collection first');
  }
};

const handleFolderModalClose = () => {
  showFolderModal.value = false;
  folderCollectionId.value = null;
  folderCollectionName.value = '';
};

const handleFolderCreated = async () => {
  await refreshWorkspaces();
  setTimeout(() => refreshWorkspaces(), 200);
};

const openCreateProject = (workspaceId?: string) => {
  const wsId = workspaceId || currentWorkspaceId.value || workspaces.value?.[0]?.id;
  if (wsId) {
    projectWorkspaceId.value = wsId;
    showProjectModal.value = true;
  } else {
    alert('Please create a workspace first');
  }
};

const openCreateWorkspace = () => {
  showWorkspaceModal.value = true;
};

const openRenameWorkspace = (workspace: { id: string; name: string }) => {
  workspaceToRename.value = workspace;
  showRenameWorkspaceModal.value = true;
};

const handleRestoreRequest = (request: any) => {
  selectedMock.value = null;
  
  const newRequest: HttpRequest = {
    ...request,
    id: '',
    folderId: '',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const newTabKey = createTabKey();
  const newTab: OpenTab = {
    key: newTabKey,
    request: newRequest,
    hasUnsavedChanges: true
  };
  openTabs.value.push(newTab);
  activeTabKey.value = newTabKey;
  selectedRequest.value = newRequest;
};

// API Definitions handlers
const showGenerateModal = ref(false);
const selectedDefinition = ref<any>(null);
const selectedEndpoints = ref<string[]>([]);
const targetCollection = ref('root');
const responseDelay = ref(0);
const responseType = ref<'success' | 'error'>('success');
const isGenerating = ref(false);
const showDefinitionDocs = ref(false);
const definitionDocs = ref<any>(null);

const handleViewDefinitionDocs = (definition: any) => {
  definitionDocs.value = definition;
  showDefinitionDocs.value = true;
};

const handleGenerateDefinitionMocks = (definition: any) => {
  selectedDefinition.value = definition;
  if (definition.parsedInfo) {
    selectedEndpoints.value = definition.parsedInfo.endpoints.map((ep: any) => `${ep.method}:${ep.path}`);
  }
  targetCollection.value = 'root';
  responseType.value = 'success';
  showGenerateModal.value = true;
};

const handleReimportDefinition = (definition: any) => {
  showImportModal.value = true;
};

const toggleEndpoint = (method: string, path: string) => {
  const key = `${method}:${path}`;
  if (selectedEndpoints.value.includes(key)) {
    selectedEndpoints.value = selectedEndpoints.value.filter(k => k !== key);
  } else {
    selectedEndpoints.value.push(key);
  }
};

const getPreviewForEndpoint = (method: string, path: string) => {
  if (!selectedDefinition.value?.parsedInfo) return null;
  
  const endpoint = selectedDefinition.value.parsedInfo.endpoints.find(
    (ep: any) => ep.method === method && ep.path === path
  );
  
  if (!endpoint) return null;
  
  const responses = endpoint.responses || {};
  let status = 200;
  let responseData = {};
  
  if (responseType.value === 'success') {
    const successKey = Object.keys(responses).find(k => k.startsWith('2'));
    if (successKey) {
      status = parseInt(successKey);
      const responseObj = responses[successKey];
      if (responseObj?.content?.['application/json']) {
        const mediaType = responseObj.content['application/json'];
        responseData = mediaType.example || 
          (mediaType.examples ? Object.values(mediaType.examples)[0]?.value : {}) || 
          (mediaType.schema ? generateMockDataFromSchema(mediaType.schema) : {});
      }
    }
  } else {
    const errorKey = Object.keys(responses).find(k => k.startsWith('4') || k.startsWith('5'));
    if (errorKey) {
      status = parseInt(errorKey);
      const responseObj = responses[errorKey];
      if (responseObj?.content?.['application/json']) {
        const mediaType = responseObj.content['application/json'];
        responseData = mediaType.example || 
          (mediaType.examples ? Object.values(mediaType.examples)[0]?.value : {}) || 
          (mediaType.schema ? generateMockDataFromSchema(mediaType.schema) : {});
      }
    }
  }
  
  return { status, response: responseData };
};

const generateMockDataFromSchema = (schema: any): any => {
  if (!schema) return {};
  
  if (schema.type === 'object' && schema.properties) {
    const result: any = {};
    for (const [key, prop] of Object.entries(schema.properties as any)) {
      result[key] = generateMockDataFromSchema(prop);
    }
    return result;
  }
  
  if (schema.type === 'array' && schema.items) {
    return [generateMockDataFromSchema(schema.items)];
  }
  
  if (schema.type === 'string') {
    if (schema.enum) return schema.enum[0];
    if (schema.format === 'email') return 'user@example.com';
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.example) return schema.example;
    return 'string';
  }
  
  if (schema.type === 'number' || schema.type === 'integer') {
    if (schema.enum) return schema.enum[0];
    if (schema.example) return schema.example;
    return schema.minimum || 0;
  }
  
  if (schema.type === 'boolean') {
    if (schema.example !== undefined) return schema.example;
    return true;
  }
  
  if (schema.example) return schema.example;
  if (schema.default) return schema.default;
  
  return {};
};

const generateMocks = async () => {
  if (!selectedDefinition.value) return;

  isGenerating.value = true;
  try {
    await $fetch(`/api/definitions/${selectedDefinition.value.id}/generate-mocks`, {
      method: 'POST',
      body: {
        endpoints: selectedEndpoints.value,
        collection: targetCollection.value,
        delay: responseDelay.value,
        responseType: responseType.value
      }
    });
    showGenerateModal.value = false;
    refresh();
  } catch (e: any) {
    alert('Error generating mocks: ' + (e.data?.message || e.message));
  } finally {
    isGenerating.value = false;
  }
};

// Collection Management
const openCreateCollection = (projectId?: string) => {
    collectionModalMode.value = 'create';
    collectionForm.value = {
        id: '',
        projectId: projectId || currentProjectId.value || '',
        name: '',
        description: '',
        color: '#6366f1'
    };
    showCollectionModal.value = true;
};

const openEditCollection = (collection: Collection) => {
    collectionModalMode.value = 'edit';
    collectionForm.value = {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        color: collection.color
    };
    showCollectionModal.value = true;
};

const saveCollection = async () => {
    try {
        if (collectionModalMode.value === 'create') {
            if (!collectionForm.value.projectId) {
                alert('Please select a project');
                return;
            }
            await $fetch(`/api/admin/projects/${collectionForm.value.projectId}/collections`, {
                method: 'POST',
                body: {
                    name: collectionForm.value.name,
                    description: collectionForm.value.description
                }
            });
        } else {
            await $fetch('/api/admin/collections', {
                method: 'PUT',
                body: {
                    id: collectionForm.value.id,
                    name: collectionForm.value.name,
                    description: collectionForm.value.description,
                    color: collectionForm.value.color
                }
            });
        }
        showCollectionModal.value = false;
        refreshWorkspaces();
    } catch (e: any) {
        alert('Error saving collection: ' + (e.data?.message || e.message));
    }
};

const confirmDeleteCollection = (collection: Collection) => {
    collectionToDelete.value = collection;
    showDeleteCollectionConfirm.value = true;
};

const deleteCollection = async () => {
    if (!collectionToDelete.value) return;
    try {
        await $fetch(`/api/admin/collections/${collectionToDelete.value.id}`, { method: 'DELETE' });
        showDeleteCollectionConfirm.value = false;
        collectionToDelete.value = null;
        refreshWorkspaces();
    } catch (e: any) {
        alert('Error deleting collection: ' + (e.data?.message || e.message));
    }
};

// Project deletion state
const showDeleteProjectConfirm = ref(false);
const projectToDelete = ref<any>(null);

const confirmDeleteProject = (project: any) => {
    projectToDelete.value = project;
    showDeleteProjectConfirm.value = true;
};

const deleteProject = async () => {
    if (!projectToDelete.value) return;
    try {
        await $fetch(`/api/admin/projects/${projectToDelete.value.id}`, { method: 'DELETE' });
        showDeleteProjectConfirm.value = false;
        projectToDelete.value = null;
        selectedWorkspaceId.value = null;
        refreshWorkspaces();
    } catch (e: any) {
        alert('Error deleting project: ' + (e.data?.message || e.message));
    }
};

const confirmDeleteGroup = (collectionId: string, name: string, mocks: Mock[]) => {
    groupToDelete.value = { collectionId, name, mocks };
    showDeleteGroupConfirm.value = true;
};

const deleteGroup = async () => {
    if (!groupToDelete.value) return;
    
    try {
        await Promise.all(groupToDelete.value.mocks.map(mock => 
            $fetch(`/api/admin/mocks?id=${mock.id}`, { method: 'DELETE' })
        ));
        
        showDeleteGroupConfirm.value = false;
        groupToDelete.value = null;
        selectedMock.value = null;
        refresh();
    } catch (e: any) {
        alert('Error deleting folder: ' + e.message);
    }
};

// Folder deletion state
const showDeleteFolderConfirm = ref(false);
const folderToDelete = ref<any>(null);

const confirmDeleteFolder = (folder: any) => {
    folderToDelete.value = folder;
    showDeleteFolderConfirm.value = true;
};

const deleteFolder = async () => {
    if (!folderToDelete.value) return;
    
    try {
        await $fetch(`/api/admin/folders/${folderToDelete.value.id}`, { method: 'DELETE' });
        showDeleteFolderConfirm.value = false;
        folderToDelete.value = null;
        refreshWorkspaces();
    } catch (e: any) {
        alert('Error deleting folder: ' + (e.data?.message || e.message));
    }
};

// Request deletion state
const showDeleteRequestConfirm = ref(false);
const requestToDelete = ref<any>(null);

const confirmDeleteRequest = (request: any) => {
    requestToDelete.value = request;
    showDeleteRequestConfirm.value = true;
};

const deleteRequest = async () => {
    if (!requestToDelete.value) return;
    const requestId = requestToDelete.value.id;
    
    try {
        await $fetch(`/api/admin/requests/${requestId}`, { method: 'DELETE' });
        showDeleteRequestConfirm.value = false;
        requestToDelete.value = null;
        
        // Close the tab if it's open
        const tabIndex = openTabs.value.findIndex(t => t.request?.id === requestId);
        if (tabIndex !== -1) {
            openTabs.value.splice(tabIndex, 1);
        }
        
        if (selectedRequest.value?.id === requestId) {
            selectedRequest.value = null;
        }
        
        await refreshWorkspaces();
    } catch (e: any) {
        alert('Error deleting request: ' + e.message);
    }
};

// Rename state
const showRenameModal = ref(false);
const renameType = ref<'project' | 'collection' | 'folder'>('project');
const itemToRename = ref<any>(null);
const renameValue = ref('');

const openRenameProject = (project: any) => {
    renameType.value = 'project';
    itemToRename.value = project;
    renameValue.value = project.name;
    showRenameModal.value = true;
};

const openRenameCollection = (collection: any) => {
    renameType.value = 'collection';
    itemToRename.value = collection;
    renameValue.value = collection.name;
    showRenameModal.value = true;
};

const openRenameFolder = (folder: any) => {
    renameType.value = 'folder';
    itemToRename.value = folder;
    renameValue.value = folder.name;
    showRenameModal.value = true;
};

const renameItem = async () => {
    if (!itemToRename.value || !renameValue.value.trim()) return;
    
    const newName = renameValue.value.trim();
    
    try {
        if (renameType.value === 'project') {
            await $fetch(`/api/admin/projects/${itemToRename.value.id}`, {
                method: 'PUT',
                body: { name: newName }
            });
        } else if (renameType.value === 'collection') {
            await $fetch(`/api/admin/collections/${itemToRename.value.id}`, {
                method: 'PUT',
                body: { name: newName }
            });
        } else if (renameType.value === 'folder') {
            await $fetch(`/api/admin/folders/${itemToRename.value.id}`, {
                method: 'PUT',
                body: { name: newName }
            });
        }
        
        showRenameModal.value = false;
        itemToRename.value = null;
        renameValue.value = '';
        refreshWorkspaces();
    } catch (e: any) {
        alert('Error renaming: ' + (e.data?.message || e.message));
    }
};

const handleReorderFolders = async (collectionId: string, updates: { id: string; parentFolderId: string | null; order: number }[]) => {
    try {
        await $fetch('/api/admin/folders/reorder', {
            method: 'POST',
            body: { collectionId, updates }
        });
        refresh();
    } catch (e: any) {
        alert('Error reordering folders: ' + (e.data?.message || e.message));
        refresh();
    }
};

const handleReorderRequests = async (folderId: string, updates: { id: string; folderId: string; order: number }[]) => {
    try {
        await $fetch('/api/admin/requests/reorder', {
            method: 'POST',
            body: { folderId, updates }
        });
        refresh();
    } catch (e: any) {
        alert('Error reordering requests: ' + (e.data?.message || e.message));
        refresh();
    }
};

const urlInputRef = ref<HTMLInputElement | null>(null);

const focusUrlInput = () => {
    nextTick(() => {
        const urlInput = document.querySelector('.VariableInput input') as HTMLInputElement;
        if (urlInput) {
            urlInput.focus();
            urlInput.select();
        }
    });
};

const { isHelpVisible, showHelp, hideHelp } = useKeyboardShortcuts({
    onSendRequest: () => {
        if (selectedRequest.value && activeTabKey.value) {
            const sendButton = document.querySelector('.RequestBuilder button[class*="bg-accent-blue"]') as HTMLButtonElement;
            if (sendButton && !sendButton.disabled) {
                sendButton.click();
            }
        }
    },
    onSaveRequest: () => {
        if (selectedRequest.value && activeTabKey.value) {
            handleSaveRequest(selectedRequest.value);
        }
    },
    onNewTab: () => {
        handleNewTab();
    },
    onCloseTab: () => {
        if (activeTabKey.value) {
            handleCloseTab(activeTabKey.value);
        }
    },
    onFocusUrl: () => {
        focusUrlInput();
    },
    onToggleHelp: () => {
        showHelp();
    }
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Header -->
    <AppHeader 
      title="Mock Services"
      :environments="environments || []"
      :active-environment-id="activeEnvironment?.id || null"
      :current-project-id="currentProjectId || null"
      @open-settings="openSettings"
      @export-open-a-p-i="exportOpenAPI"
      @import-open-a-p-i="openImportModal"
      @activate-environment="activateEnvironment"
    />

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <AppSidebar
        :collections="collections || []"
        :mocks="mocks || []"
        :selected-mock-id="selectedMock?.id"
        :workspaces="workspaces || []"
        :selected-workspace-id="selectedWorkspaceId"
        :refresh-trigger="definitionsRefreshTrigger"
        @select-mock="handleSelectMock"
        @select-request="handleSelectRequest"
        @create-mock="goToCreate"
        @create-resource="showResourceModal = true"
        @create-collection="openCreateCollection"
        @create-request="openCreateRequest"
        @create-folder="openCreateFolder"
        @create-project="openCreateProject"
        @create-workspace="openCreateWorkspace"
        @rename-workspace="openRenameWorkspace"
        @rename-project="openRenameProject"
        @delete-project="confirmDeleteProject"
        @edit-collection="openEditCollection"
        @rename-collection="openRenameCollection"
        @delete-collection="confirmDeleteCollection"
        @delete-group="confirmDeleteGroup"
        @delete-folder="confirmDeleteFolder"
        @rename-folder="openRenameFolder"
        @delete-request="confirmDeleteRequest"
        @restore-request="handleRestoreRequest"
        @compare="handleCompareResponses"
        @view-definition-docs="handleViewDefinitionDocs"
        @generate-definition-mocks="handleGenerateDefinitionMocks"
        @reimport-definition="handleReimportDefinition"
        @reorder-folders="handleReorderFolders"
        @reorder-requests="handleReorderRequests"
        @select-workspace="selectedWorkspaceId = $event"
        @import-complete="definitionsRefreshTrigger++"
      />

      <!-- Main Content -->
      <main class="flex flex-col flex-1 overflow-hidden bg-bg-primary">
        <!-- Empty State -->
        <div v-if="!selectedMock && !selectedRequest && openTabs.length === 0" class="flex flex-col items-center justify-center h-full p-10 text-center">
          <div class="mb-6">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-30">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-text-primary mb-2">Select an endpoint</h2>
          <p class="text-text-secondary mb-6 max-w-[340px]">Choose an endpoint from the sidebar to view details, test it, and generate code snippets</p>
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="goToCreate()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Mock
            </button>
            <button class="btn btn-secondary" @click="handleNewTab()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              New Request Tab
            </button>
          </div>
        </div>

        <!-- Request Tabs Area -->
        <div v-if="openTabs.length > 0" class="flex flex-col flex-1 overflow-hidden">
          <!-- Tabs -->
          <RequestTabs
            :open-tabs="openTabs"
            :active-tab-key="activeTabKey"
            @select-tab="handleSelectTab"
            @close-tab="handleCloseTab"
            @new-tab="handleNewTab"
            @reorder-tabs="handleReorderTabs"
          />

          <!-- Request Builder -->
          <RequestBuilder
            v-if="selectedRequest && activeTabKey"
            :request="selectedRequest"
            :workspace-id="currentWorkspaceId"
            :environment-id="activeEnvironment?.id"
            :project-id="currentProjectId"
            @save-request="handleSaveRequest"
            @save-as-request="handleSaveAsRequest"
            @unsaved-changes="updateTabUnsavedStatus"
          />
          
          <!-- Placeholder when no active tab -->
          <div v-else-if="!selectedRequest" class="flex-1 flex items-center justify-center text-text-muted">
            Select a request from the tabs
          </div>
        </div>

        <!-- Selected Mock Details -->
        <div v-else-if="selectedMock" class="p-5 flex flex-col gap-5 h-[calc(100vh-48px)] overflow-y-auto">
          <!-- URL Bar -->
          <div class="flex items-center gap-3 p-3 px-4 bg-bg-secondary border border-border-default rounded-lg">
            <MethodBadge :method="selectedMock.method" size="lg" />
            <div class="flex-1 py-2 px-3 bg-bg-input rounded overflow-hidden">
              <span class="text-sm text-text-primary font-mono">{{ buildFullUrl(selectedMock) }}</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- Action buttons -->
              <button 
                class="flex items-center justify-center w-[34px] h-[34px] bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" 
                @click="copyPath(selectedMock)" 
                title="Copy URL"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </button>
              <button 
                class="flex items-center justify-center w-[34px] h-[34px] bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" 
                @click="duplicateMock(selectedMock)" 
                title="Duplicate Mock"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="14" height="14" rx="2"></rect>
                  <path d="M7 21h12a2 2 0 0 0 2-2V7"></path>
                </svg>
              </button>
              <button 
                class="flex items-center justify-center w-[34px] h-[34px] bg-transparent border-none rounded-md text-text-secondary cursor-pointer transition-all duration-fast hover:bg-accent-red/15 hover:text-accent-red" 
                @click="confirmDeleteMock(selectedMock)" 
                title="Delete Mock"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
              <div class="w-px h-6 bg-border-default mx-2"></div>
              <button class="btn btn-primary" @click="goToEdit(selectedMock.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                Edit
              </button>
            </div>
          </div>

          <!-- Two Column Layout -->
          <div class="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5 flex-1 min-h-0">
            <!-- Left Column: Info & Response -->
            <div class="flex flex-col gap-4">
              <!-- Info Cards -->
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3.5 bg-bg-secondary border border-border-default rounded-lg">
                  <div class="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">Status Code</div>
                  <div :class="['text-base font-semibold', selectedMock.status >= 200 && selectedMock.status < 300 ? 'text-accent-green' : 'text-accent-yellow']">
                    {{ selectedMock.status }}
                  </div>
                </div>
                <div class="p-3.5 bg-bg-secondary border border-border-default rounded-lg">
                  <div class="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">Delay</div>
                  <div class="text-base font-semibold text-text-primary">{{ selectedMock.delay || 0 }}ms</div>
                </div>
                <div class="p-3.5 bg-bg-secondary border border-border-default rounded-lg">
                  <div class="flex items-center justify-between mb-1.5">
                    <div class="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Security</div>
                    <button 
                      class="flex items-center justify-center w-5 h-5 p-0 border-none bg-transparent text-text-muted rounded cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" 
                      @click="openSettings" 
                      title="Configure Security Settings"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </button>
                  </div>
                  <div class="flex items-center gap-2 text-[13px]">
                    <button 
                      @click="toggleSecure(selectedMock)" 
                      :class="[
                        'relative w-9 h-5 border-none rounded-[10px] cursor-pointer transition-colors duration-normal',
                        selectedMock.secure ? 'bg-accent-green' : 'bg-bg-hover'
                      ]"
                    >
                      <span 
                        :class="[
                          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-normal',
                          selectedMock.secure ? 'translate-x-4' : 'translate-x-0'
                        ]"
                      ></span>
                    </button>
                    <span :class="selectedMock.secure ? 'text-accent-green' : 'text-text-primary'">
                      {{ selectedMock.secure ? 'Protected' : 'Public' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Response Preview -->
              <div class="flex-1 flex flex-col bg-bg-secondary border border-border-default rounded-lg min-h-[200px] overflow-hidden">
                <div class="flex items-center justify-between py-2.5 px-3.5 border-b border-border-default flex-shrink-0">
                  <h3 class="text-xs font-semibold text-text-primary">Response Body</h3>
                  <button class="btn btn-ghost btn-sm" @click="previewResponse(selectedMock.response)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14 21 3"></path>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    </svg>
                    Expand
                  </button>
                </div>
                <div class="flex-1 p-3.5 overflow-auto">
                  <pre class="font-mono text-xs leading-normal text-text-primary m-0 whitespace-pre-wrap break-words">{{ JSON.stringify(selectedMock.response, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <!-- Right Column: Code Snippets -->
            <div class="flex flex-col xl:order-none order-first xl:max-h-none max-h-[300px]">
              <div class="flex flex-col bg-bg-secondary border border-border-default rounded-lg h-full overflow-hidden">
                <div class="flex items-center justify-between py-2.5 px-3.5 border-b border-border-default">
                  <h3 class="text-xs font-semibold text-text-primary">Code Snippets</h3>
                  <button class="btn btn-ghost btn-sm" @click="copySnippet" title="Copy to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                  </button>
                </div>
                <div class="flex border-b border-border-default">
                  <button 
                    v-for="lang in ['curl', 'javascript', 'python', 'php']"
                    :key="lang"
                    :class="[
                      'flex-1 py-2 px-3 bg-transparent border-none border-b-2 text-[11px] font-medium cursor-pointer -mb-px transition-all duration-fast',
                      snippetLang === lang ? 'text-accent-orange border-b-accent-orange' : 'text-text-secondary border-b-transparent hover:text-text-primary hover:bg-bg-hover'
                    ]"
                    @click="snippetLang = lang"
                  >
                    {{ lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : 'PHP' }}
                  </button>
                </div>
                <div class="flex-1 p-3.5 overflow-auto bg-bg-tertiary">
                  <pre class="font-mono text-[11px] leading-normal text-text-primary m-0 whitespace-pre-wrap break-words">{{ codeSnippets[snippetLang] }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Panel: Try It -->
          <div class="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
            <div class="flex items-center justify-between py-3 px-4 border-b border-border-default">
              <h3 class="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Try It
              </h3>
              <div class="flex items-center gap-3">
                <span v-if="tryItResponse && !tryItLoading" class="text-xs text-text-muted font-mono">
                  {{ tryItTime }}ms
                </span>
                <button 
                  class="btn btn-primary" 
                  @click="sendTestRequest" 
                  :disabled="tryItLoading"
                >
                  <svg v-if="tryItLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  {{ tryItLoading ? 'Sending...' : 'Send Request' }}
                </button>
              </div>
            </div>
            <div class="p-4 min-h-[120px]">
              <div v-if="!tryItResponse && !tryItError" class="flex flex-col items-center justify-center gap-3 py-6 text-text-muted text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="opacity-30">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <p class="text-[13px]">Click "Send Request" to test this mock endpoint</p>
              </div>
              <div v-else class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <span 
                    :class="[
                      'py-1 px-2.5 rounded text-[11px] font-semibold uppercase',
                      tryItError ? 'bg-accent-red/15 text-accent-red' : 'bg-accent-green/15 text-accent-green'
                    ]"
                  >
                    {{ tryItError ? 'Error' : 'Success' }}
                  </span>
                  <span class="text-xs text-text-muted">Response received in {{ tryItTime }}ms</span>
                </div>
                <div class="bg-bg-tertiary rounded-md p-3.5 max-h-[200px] overflow-auto">
                  <pre class="font-mono text-xs leading-normal text-text-primary m-0 whitespace-pre-wrap break-words">{{ tryItError || JSON.stringify(tryItResponse, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Settings Modal -->
    <Modal :show="showSettingsModal" title="Settings" @close="showSettingsModal = false">
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Global Bearer Token Secret</label>
        <input 
          v-model="settingsForm.bearerToken" 
          type="text" 
          placeholder="my-secret-token" 
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        />
        <p class="text-xs text-text-muted mt-1.5">If set, secured endpoints will require this exact token.</p>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showSettingsModal = false">Cancel</button>
        <button class="btn btn-primary" @click="saveSettings">Save Settings</button>
      </template>
    </Modal>

    <!-- Create Resource Modal -->
    <Modal :show="showResourceModal" title="Create Full Resource" @close="showResourceModal = false">
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Resource Name (plural)</label>
        <input 
          v-model="resourceForm.name" 
          placeholder="users" 
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        />
      </div>
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Collection</label>
        <div class="relative">
          <div 
             class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded pointer-events-none"
             :style="{ backgroundColor: getCollectionColor(resourceForm.collection) }"
           ></div>
          <select 
            v-model="resourceForm.collection" 
            class="w-full py-2.5 px-3 pl-9 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)] appearance-none cursor-pointer bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%239ca3af%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpolyline%20points%3D%276%209%2012%2015%2018%209%27%3E%3C/polyline%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center]"
          >
            <option value="root">Root (No Collection)</option>
            <option v-for="col in collections" :key="col.id" :value="col.id">
              {{ col.name }}
            </option>
          </select>
        </div>
      </div>
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Base Path Prefix</label>
        <input 
          v-model="resourceForm.basePath" 
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        />
        <p class="text-xs text-text-muted mt-2 font-mono">
          Will generate: {{ resourceForm.basePath }}{{ resourceForm.name || '{resource}' }}...
        </p>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showResourceModal = false">Cancel</button>
        <button class="btn btn-success" @click="createResource" :disabled="!resourceForm.name">Create Resource</button>
      </template>
    </Modal>

    <!-- Response Preview Modal -->
    <Modal :show="showPreviewModal" title="Response Preview" size="lg" @close="showPreviewModal = false">
      <div class="max-h-[60vh] overflow-auto bg-bg-tertiary rounded-md p-4">
        <pre class="font-mono text-xs leading-normal text-text-primary m-0 whitespace-pre-wrap break-words">{{ previewContent }}</pre>
      </div>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteConfirm" title="Delete Mock" @close="showDeleteConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this mock endpoint?
        <br />
        <code class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange font-mono">{{ mockToDelete?.method }} {{ mockToDelete?.path }}</code>
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteMock">Delete</button>
      </template>
    </Modal>

    <!-- Collection Modal -->
    <Modal 
      :show="showCollectionModal" 
      :title="collectionModalMode === 'create' ? 'Create Collection' : 'Edit Collection'" 
      @close="showCollectionModal = false"
    >
      <div v-if="collectionModalMode === 'create'" class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Project</label>
        <select 
          v-model="collectionForm.projectId"
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue cursor-pointer"
        >
          <option value="">Select a project</option>
          <optgroup v-for="workspace in workspaces" :key="workspace.id" :label="workspace.name">
            <option v-for="project in workspace.projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </optgroup>
        </select>
      </div>
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Collection Name</label>
        <input 
          v-model="collectionForm.name" 
          placeholder="My Project" 
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="collectionModalMode === 'edit' && collectionForm.name === 'root'"
        />
      </div>
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Description (optional)</label>
        <input 
          v-model="collectionForm.description" 
          placeholder="API endpoints for..." 
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        />
      </div>
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Color</label>
        <div class="flex gap-2 flex-wrap">
          <button 
            v-for="color in collectionColors" 
            :key="color"
            :class="[
              'w-8 h-8 rounded-md border-2 cursor-pointer transition-all duration-fast hover:scale-110',
              collectionForm.color === color ? 'border-text-primary shadow-[0_0_0_2px_var(--bg-primary),0_0_0_4px_var(--text-muted)]' : 'border-transparent'
            ]"
            :style="{ backgroundColor: color }"
            @click="collectionForm.color = color"
          ></button>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showCollectionModal = false">Cancel</button>
        <button class="btn btn-primary" @click="saveCollection">
          {{ collectionModalMode === 'create' ? 'Create Collection' : 'Save Changes' }}
        </button>
      </template>
    </Modal>

    <!-- Delete Project Confirmation Modal -->
    <Modal :show="showDeleteProjectConfirm" title="Delete Project" @close="showDeleteProjectConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this project?
        <br />
        <code class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange font-mono">{{ projectToDelete?.name }}</code>
        <br /><br />
        <strong class="text-accent-red">Warning:</strong> This will permanently delete this project, all collections, folders, and requests within it.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteProjectConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteProject">Delete Project</button>
      </template>
    </Modal>

    <!-- Delete Collection Confirmation Modal -->
    <Modal :show="showDeleteCollectionConfirm" title="Delete Collection" @close="showDeleteCollectionConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this collection?
        <br />
        <code class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange font-mono">{{ collectionToDelete?.name }}</code>
        <br /><br />
        <strong>Note:</strong> All mocks in this collection will be moved to the "root" collection.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteCollectionConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteCollection">Delete Collection</button>
      </template>
    </Modal>

    <!-- Delete Group Confirmation Modal -->
    <Modal :show="showDeleteGroupConfirm" title="Delete Folder" @close="showDeleteGroupConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this folder?
        <br />
        <code class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange font-mono">{{ groupToDelete?.name }}</code>
        <br /><br />
        <strong class="text-accent-red">Warning:</strong> This will permanently delete <strong>{{ groupToDelete?.mocks.length }}</strong> mocks inside this folder.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteGroupConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteGroup">Delete Folder & Items</button>
      </template>
    </Modal>

    <!-- Delete Folder Confirmation Modal -->
    <Modal :show="showDeleteFolderConfirm" title="Delete Folder" @close="showDeleteFolderConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this folder?
        <br />
        <code class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange font-mono">{{ folderToDelete?.name }}</code>
        <br /><br />
        <strong class="text-accent-red">Warning:</strong> This will permanently delete this folder and all its contents.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteFolderConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteFolder">Delete Folder</button>
      </template>
    </Modal>

    <!-- Delete Request Confirmation Modal -->
    <Modal :show="showDeleteRequestConfirm" title="Delete Request" @close="showDeleteRequestConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this request?
        <br />
        <code class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange font-mono">{{ requestToDelete?.method }} {{ requestToDelete?.name }}</code>
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteRequestConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteRequest">Delete Request</button>
      </template>
    </Modal>

    <!-- Rename Modal -->
    <Modal :show="showRenameModal" :title="`Rename ${renameType.charAt(0).toUpperCase() + renameType.slice(1)}`" @close="showRenameModal = false">
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
          {{ renameType.charAt(0).toUpperCase() + renameType.slice(1) }} Name
        </label>
        <input 
          v-model="renameValue" 
          :placeholder="`Enter ${renameType} name`"
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
          @keyup.enter="renameItem"
          autofocus
        />
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showRenameModal = false">Cancel</button>
        <button class="btn btn-primary" @click="renameItem">Rename</button>
      </template>
    </Modal>

    <!-- Save Request Dialog -->
    <SaveRequestDialog
      :show="showSaveDialog || showSaveAsDialog"
      :request="showSaveDialog ? requestToSave : requestToSaveAs"
      :workspaces="workspaces || []"
      :is-save-as="showSaveAsDialog"
      :default-collection-id="saveDialogDefaultCollectionId"
      :default-folder-id="saveDialogDefaultFolderId"
      @close="showSaveDialog = false; showSaveAsDialog = false; requestToSave = null; requestToSaveAs = null; saveDialogDefaultCollectionId = ''; saveDialogDefaultFolderId = ''"
      @save="showSaveDialog ? handleSave($event) : handleSaveAs($event)"
    />

    <!-- Import Modal -->
    <ImportModal
      :show="showImportModal"
      :workspaces="workspaces || []"
      @close="showImportModal = false"
      @import-complete="() => { refresh(); definitionsRefreshTrigger++; }"
    />

    <!-- API Documentation Viewer Modal -->
    <ApiDocumentationViewer
      :show="showDefinitionDocs"
      :spec="definitionDocs?.parsedInfo || null"
      :definition-name="definitionDocs?.name || 'API Documentation'"
      @close="showDefinitionDocs = false"
    />

    <!-- Generate Mocks Modal -->
    <Modal :show="showGenerateModal" title="Generate Mocks" size="lg" @close="showGenerateModal = false">
      <div v-if="selectedDefinition && selectedDefinition.parsedInfo">
        <div class="mb-4">
          <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Target Collection</label>
          <select v-model="targetCollection" class="w-full py-2 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue">
            <option value="root">Root</option>
            <option v-for="col in collections" :key="col.id" :value="col.id">{{ col.name }}</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Response Type</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" v-model="responseType" value="success" class="w-4 h-4" />
              <span class="text-sm text-text-primary">Success (2xx)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" v-model="responseType" value="error" class="w-4 h-4" />
              <span class="text-sm text-text-primary">Error (4xx/5xx)</span>
            </label>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Response Delay (ms)</label>
          <input type="number" v-model.number="responseDelay" class="w-full py-2 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue" min="0" />
        </div>

        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide">Select Endpoints</label>
            <div class="text-xs">
              <button class="text-accent-blue hover:underline mr-2" @click="selectedEndpoints = selectedDefinition.parsedInfo.endpoints.map(ep => `${ep.method}:${ep.path}`)">Select All</button>
              <button class="text-text-muted hover:underline" @click="selectedEndpoints = []">Deselect All</button>
            </div>
          </div>
          <div class="max-h-[300px] overflow-y-auto border border-border-default rounded-md bg-bg-tertiary divide-y divide-border-default">
            <div
              v-for="ep in selectedDefinition.parsedInfo.endpoints"
              :key="`${ep.method}:${ep.path}`"
              class="flex items-center p-2 hover:bg-bg-hover cursor-pointer"
              @click="toggleEndpoint(ep.method, ep.path)">
              <input type="checkbox" :checked="selectedEndpoints.includes(`${ep.method}:${ep.path}`)" class="mr-3" />
              <MethodBadge :method="ep.method" size="sm" class="mr-2" />
              <span class="text-sm font-mono text-text-primary truncate">{{ ep.path }}</span>
              <span v-if="ep.summary" class="ml-2 text-xs text-text-muted truncate">- {{ ep.summary }}</span>
            </div>
          </div>
          <p class="text-xs text-text-muted mt-2">{{ selectedEndpoints.length }} selected</p>
        </div>

        <div v-if="selectedEndpoints.length === 1" class="mb-4">
          <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Preview Mock Response</label>
          <div class="bg-bg-tertiary border border-border-default rounded-md p-3">
            <div v-if="getPreviewForEndpoint(parseInt(selectedEndpoints[0].split(':')[0]), selectedEndpoints[0].split(':')[1])" class="space-y-2">
              <div class="flex items-center gap-2">
                <span :class="[
                  'px-2 py-1 rounded text-xs font-semibold',
                  responseType === 'success' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'
                ]">
                  {{ getPreviewForEndpoint(parseInt(selectedEndpoints[0].split(':')[0]), selectedEndpoints[0].split(':')[1])?.status }}
                </span>
                <span class="text-xs text-text-muted">{{ responseType === 'success' ? 'Success' : 'Error' }} Response</span>
              </div>
              <pre class="text-xs font-mono text-text-primary overflow-auto max-h-[200px] whitespace-pre-wrap break-words">{{ JSON.stringify(getPreviewForEndpoint(parseInt(selectedEndpoints[0].split(':')[0]), selectedEndpoints[0].split(':')[1])?.response, null, 2) }}</pre>
            </div>
            <div v-else class="text-xs text-text-muted">
              No response available for selected endpoint
            </div>
          </div>
        </div>
      </div>
      <div v-else class="py-8 text-center text-text-muted">
        Loading definition details...
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="showGenerateModal = false">Cancel</button>
        <button class="btn btn-primary" @click="generateMocks" :disabled="isGenerating || selectedEndpoints.length === 0">
          {{ isGenerating ? 'Generating...' : 'Generate Mocks' }}
        </button>
      </template>
    </Modal>

    <!-- Response Comparison Modal -->
    <ResponseComparison
      v-if="showComparison && comparisonLeft && comparisonRight"
      :left-response="comparisonLeft"
      :right-response="comparisonRight"
      @close="closeComparison"
    />

    <!-- Create Workspace Modal -->
    <CreateWorkspaceModal
      :show="showWorkspaceModal"
      @close="showWorkspaceModal = false"
      @created="(workspace) => { refreshWorkspaces(); selectedWorkspaceId = workspace.id; }"
    />

    <!-- Rename Workspace Modal -->
    <RenameWorkspaceModal
      :show="showRenameWorkspaceModal"
      :workspace="workspaceToRename"
      @close="showRenameWorkspaceModal = false; workspaceToRename = null"
      @renamed="refreshWorkspaces"
    />

    <!-- Create Project Modal -->
    <CreateProjectModal
      v-if="projectWorkspaceId"
      :show="showProjectModal"
      :workspace-id="projectWorkspaceId"
      :workspace-name="workspaces?.find(w => w.id === projectWorkspaceId)?.name || ''"
      @close="showProjectModal = false"
      @created="refreshWorkspaces()"
    />

    <!-- Create Folder Modal -->
    <CreateFolderModal
      :show="showFolderModal"
      :collection-id="folderCollectionId || ''"
      :collection-name="folderCollectionName"
      @close="handleFolderModalClose"
      @created="handleFolderCreated"
    />

    <!-- Create Request Modal -->
    <CreateRequestModal
      :show="showRequestModal"
      :folder-id="requestFolderId || ''"
      :folder-name="requestFolderName"
      @close="showRequestModal = false; requestFolderId = null"
      @created="refreshWorkspaces()"
    />

    <!-- Keyboard Shortcuts Help Modal -->
    <KeyboardShortcutsHelpModal
      :show="isHelpVisible"
      @close="hideHelp"
    />
  </div>
</template>