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

const { data: mocks, refresh: refreshMocks, error } = await useFetch<Mock[]>('/api/admin/mocks');
const { data: collections, refresh: refreshCollections } = await useFetch<Collection[]>('/api/admin/collections');

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

// State
const previewContent = ref('');
const selectedMock = ref<any>(null);
const mockToDelete = ref<any>(null);
const snippetLang = ref('curl');
const tryItLoading = ref(false);
const tryItResponse = ref<any>(null);
const tryItError = ref('');
const tryItTime = ref(0);
const selectedCollectionForNewMock = ref<string | null>(null);

const resourceForm = ref({
  name: '',
  basePath: '/api/'
});

const settingsForm = ref({
    bearerToken: ''
});

// Collection modal state
const collectionModalMode = ref<'create' | 'edit'>('create');
const collectionForm = ref({
  id: '',
  name: '',
  description: '',
  color: '#6366f1'
});
const collectionToDelete = ref<Collection | null>(null);

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
    if (authHeader) cmd += `\n  -H "${authHeader}"`;
    if (['POST', 'PUT', 'PATCH'].includes(mock.method)) {
        cmd += `\n  -H "Content-Type: application/json"`;
        cmd += `\n  -d '{}'`;
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
    tryItResponse.value = null;
    tryItError.value = '';
};

const createResource = async () => {
    try {
        await $fetch('/api/admin/resource', {
            method: 'POST',
            body: {
                resourceName: resourceForm.value.name,
                basePath: resourceForm.value.basePath + resourceForm.value.name
            }
        });
        showResourceModal.value = false;
        resourceForm.value.name = '';
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

// Collection Management
const openCreateCollection = () => {
    collectionModalMode.value = 'create';
    collectionForm.value = {
        id: '',
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
            await $fetch('/api/admin/collections', {
                method: 'POST',
                body: {
                    name: collectionForm.value.name,
                    description: collectionForm.value.description,
                    color: collectionForm.value.color
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
        refresh();
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
        await $fetch(`/api/admin/collections?id=${collectionToDelete.value.id}`, { method: 'DELETE' });
        showDeleteCollectionConfirm.value = false;
        collectionToDelete.value = null;
        refresh();
    } catch (e: any) {
        alert('Error deleting collection: ' + (e.data?.message || e.message));
    }
};
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <AppHeader 
      title="Mock Services"
      @open-settings="openSettings"
      @export-open-a-p-i="exportOpenAPI"
    />

    <div class="app-body">
      <!-- Sidebar -->
      <AppSidebar 
        :collections="collections || []"
        :mocks="mocks || []"
        :selected-mock-id="selectedMock?.id"
        @select-mock="handleSelectMock"
        @create-mock="goToCreate"
        @create-collection="openCreateCollection"
        @edit-collection="openEditCollection"
        @delete-collection="confirmDeleteCollection"
      />

      <!-- Main Content -->
      <main class="main-content">
        <!-- Empty State -->
        <div v-if="!selectedMock" class="empty-state">
          <div class="empty-illustration">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <h2 class="empty-title">Select an endpoint</h2>
          <p class="empty-text">Choose an endpoint from the sidebar to view details, test it, and generate code snippets</p>
          <button class="btn btn-primary" @click="goToCreate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create New Mock
          </button>
        </div>

        <!-- Selected Mock Details -->
        <div v-else class="mock-detail">
          <!-- URL Bar -->
          <div class="url-bar">
            <MethodBadge :method="selectedMock.method" size="lg" />
            <div class="url-input">
              <span class="url-text font-mono">{{ buildFullUrl(selectedMock) }}</span>
            </div>
            <div class="url-actions">
              <button class="action-btn" @click="copyPath(selectedMock)" title="Copy URL">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </button>
              <button class="action-btn" @click="duplicateMock(selectedMock)" title="Duplicate Mock">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="14" height="14" rx="2"></rect>
                  <path d="M7 21h12a2 2 0 0 0 2-2V7"></path>
                </svg>
              </button>
              <button class="action-btn action-btn--danger" @click="confirmDeleteMock(selectedMock)" title="Delete Mock">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
              <div class="action-divider"></div>
              <button class="btn btn-primary" @click="goToEdit(selectedMock.id)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
                Edit
              </button>
            </div>
          </div>

          <!-- Two Column Layout -->
          <div class="content-grid">
            <!-- Left Column: Info & Response -->
            <div class="left-column">
              <!-- Info Cards -->
              <div class="info-grid">
                <div class="info-card">
                  <div class="info-label">Status Code</div>
                  <div :class="['info-value', selectedMock.status >= 200 && selectedMock.status < 300 ? 'text-success' : 'text-warning']">
                    {{ selectedMock.status }}
                  </div>
                </div>
                <div class="info-card">
                  <div class="info-label">Delay</div>
                  <div class="info-value">{{ selectedMock.delay || 0 }}ms</div>
                </div>
                <div class="info-card">
                  <div class="info-header">
                    <div class="info-label">Security</div>
                    <button class="btn-icon-sm" @click="openSettings" title="Configure Security Settings">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </button>
                  </div>
                  <div class="info-value security-toggle">
                    <button 
                      @click="toggleSecure(selectedMock)" 
                      :class="['toggle-btn', { 'active': selectedMock.secure }]"
                    >
                      <span class="toggle-handle"></span>
                    </button>
                    <span :class="selectedMock.secure ? 'text-success' : ''">
                      {{ selectedMock.secure ? 'Protected' : 'Public' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Response Preview -->
              <div class="response-section">
                <div class="section-header">
                  <h3>Response Body</h3>
                  <button class="btn btn-ghost btn-sm" @click="previewResponse(selectedMock.response)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M15 3h6v6"></path>
                      <path d="M10 14 21 3"></path>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    </svg>
                    Expand
                  </button>
                </div>
                <div class="response-preview">
                  <pre class="json-content">{{ JSON.stringify(selectedMock.response, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <!-- Right Column: Code Snippets -->
            <div class="right-column">
              <div class="snippets-panel">
                <div class="snippets-header">
                  <h3>Code Snippets</h3>
                  <button class="btn btn-ghost btn-sm" @click="copySnippet" title="Copy to clipboard">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy
                  </button>
                </div>
                <div class="snippets-tabs">
                  <button 
                    :class="['snippet-tab', { 'active': snippetLang === 'curl' }]"
                    @click="snippetLang = 'curl'"
                  >cURL</button>
                  <button 
                    :class="['snippet-tab', { 'active': snippetLang === 'javascript' }]"
                    @click="snippetLang = 'javascript'"
                  >JavaScript</button>
                  <button 
                    :class="['snippet-tab', { 'active': snippetLang === 'python' }]"
                    @click="snippetLang = 'python'"
                  >Python</button>
                  <button 
                    :class="['snippet-tab', { 'active': snippetLang === 'php' }]"
                    @click="snippetLang = 'php'"
                  >PHP</button>
                </div>
                <div class="snippet-code">
                  <pre>{{ codeSnippets[snippetLang] }}</pre>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Panel: Try It -->
          <div class="tryit-panel">
            <div class="tryit-header">
              <h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Try It
              </h3>
              <div class="tryit-actions">
                <span v-if="tryItResponse && !tryItLoading" class="tryit-time">
                  {{ tryItTime }}ms
                </span>
                <button 
                  class="btn btn-primary" 
                  @click="sendTestRequest" 
                  :disabled="tryItLoading"
                >
                  <svg v-if="tryItLoading" class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  {{ tryItLoading ? 'Sending...' : 'Send Request' }}
                </button>
              </div>
            </div>
            <div class="tryit-body">
              <div v-if="!tryItResponse && !tryItError" class="tryit-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polygon points="10 8 16 12 10 16 10 8"></polygon>
                </svg>
                <p>Click "Send Request" to test this mock endpoint</p>
              </div>
              <div v-else class="tryit-result">
                <div class="result-status">
                  <span :class="['status-badge', tryItError ? 'status-error' : 'status-success']">
                    {{ tryItError ? 'Error' : 'Success' }}
                  </span>
                  <span class="result-info">Response received in {{ tryItTime }}ms</span>
                </div>
                <div class="result-content">
                  <pre>{{ tryItError || JSON.stringify(tryItResponse, null, 2) }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Settings Modal -->
    <Modal :show="showSettingsModal" title="Settings" @close="showSettingsModal = false">
      <div class="form-group">
        <label>Global Bearer Token Secret</label>
        <input v-model="settingsForm.bearerToken" type="text" placeholder="my-secret-token" class="form-input" />
        <p class="form-hint">If set, secured endpoints will require this exact token.</p>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showSettingsModal = false">Cancel</button>
        <button class="btn btn-primary" @click="saveSettings">Save Settings</button>
      </template>
    </Modal>

    <!-- Create Resource Modal -->
    <Modal :show="showResourceModal" title="Create Full Resource" @close="showResourceModal = false">
      <div class="form-group">
        <label>Resource Name (plural)</label>
        <input v-model="resourceForm.name" placeholder="users" class="form-input" />
      </div>
      <div class="form-group">
        <label>Base Path Prefix</label>
        <input v-model="resourceForm.basePath" class="form-input" />
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showResourceModal = false">Cancel</button>
        <button class="btn btn-success" @click="createResource">Create Resource</button>
      </template>
    </Modal>

    <!-- Response Preview Modal -->
    <Modal :show="showPreviewModal" title="Response Preview" size="lg" @close="showPreviewModal = false">
      <div class="preview-content">
        <pre class="json-content">{{ previewContent }}</pre>
      </div>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :show="showDeleteConfirm" title="Delete Mock" @close="showDeleteConfirm = false">
      <p class="confirm-text">
        Are you sure you want to delete this mock endpoint?
        <br />
        <code class="font-mono">{{ mockToDelete?.method }} {{ mockToDelete?.path }}</code>
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
      <div class="form-group">
        <label>Collection Name</label>
        <input 
          v-model="collectionForm.name" 
          placeholder="My Project" 
          class="form-input" 
          :disabled="collectionModalMode === 'edit' && collectionForm.name === 'root'"
        />
      </div>
      <div class="form-group">
        <label>Description (optional)</label>
        <input v-model="collectionForm.description" placeholder="API endpoints for..." class="form-input" />
      </div>
      <div class="form-group">
        <label>Color</label>
        <div class="color-picker">
          <button 
            v-for="color in collectionColors" 
            :key="color"
            :class="['color-option', { 'active': collectionForm.color === color }]"
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

    <!-- Delete Collection Confirmation Modal -->
    <Modal :show="showDeleteCollectionConfirm" title="Delete Collection" @close="showDeleteCollectionConfirm = false">
      <p class="confirm-text">
        Are you sure you want to delete this collection?
        <br />
        <code class="font-mono">{{ collectionToDelete?.name }}</code>
        <br /><br />
        <strong>Note:</strong> All mocks in this collection will be moved to the "root" collection.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteCollectionConfirm = false">Cancel</button>
        <button class="btn btn-danger" @click="deleteCollection">Delete Collection</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-primary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.empty-illustration {
  margin-bottom: 24px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.empty-text {
  color: var(--text-secondary);
  margin-bottom: 24px;
  max-width: 340px;
}

/* Mock Detail */
.mock-detail {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 48px);
  overflow-y: auto;
}

.url-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  background-color: var(--bg-input);
  border-radius: 4px;
  overflow: hidden;
}

.url-text {
  font-size: 14px;
  color: var(--text-primary);
}

/* URL Actions */
.url-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
}

.action-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn--danger:hover {
  background-color: rgba(239, 83, 80, 0.15);
  color: var(--accent-red);
}

.action-divider {
  width: 1px;
  height: 24px;
  background-color: var(--border-color);
  margin: 0 8px;
}

/* Content Grid - Two Columns */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

.left-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-column {
  display: flex;
  flex-direction: column;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.info-card {
  padding: 14px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.info-header .info-label {
  margin-bottom: 0;
}

.btn-icon-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  transition: all 150ms ease;
}

.btn-icon-sm:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.info-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.text-success { color: var(--accent-green); }
.text-warning { color: var(--accent-yellow); }

.security-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.toggle-btn {
  position: relative;
  width: 36px;
  height: 20px;
  background-color: var(--bg-hover);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.toggle-btn.active {
  background-color: var(--accent-green);
}

.toggle-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 200ms ease;
}

.toggle-btn.active .toggle-handle {
  transform: translateX(16px);
}

/* Response Section */
.response-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-height: 200px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.section-header h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.response-preview {
  flex: 1;
  padding: 14px;
  overflow: auto;
}

.json-content {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-content {
  max-height: 60vh;
  overflow: auto;
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  padding: 16px;
}

/* Snippets Panel */
.snippets-panel {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  height: 100%;
  overflow: hidden;
}

.snippets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.snippets-header h3 {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.snippets-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.snippet-tab {
  flex: 1;
  padding: 8px 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  margin-bottom: -1px;
}

.snippet-tab:hover {
  color: var(--text-primary);
  background-color: var(--bg-hover);
}

.snippet-tab.active {
  color: var(--accent-orange);
  border-bottom-color: var(--accent-orange);
}

.snippet-code {
  flex: 1;
  padding: 14px;
  overflow: auto;
  background-color: var(--bg-tertiary);
}

.snippet-code pre {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Try It Panel */
.tryit-panel {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.tryit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.tryit-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.tryit-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tryit-time {
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.tryit-body {
  padding: 16px;
  min-height: 120px;
}

.tryit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--text-muted);
  text-align: center;
}

.tryit-empty p {
  font-size: 13px;
}

.tryit-result {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-success {
  background-color: rgba(115, 191, 105, 0.15);
  color: var(--accent-green);
}

.status-error {
  background-color: rgba(239, 83, 80, 0.15);
  color: var(--accent-red);
}

.result-info {
  font-size: 12px;
  color: var(--text-muted);
}

.result-content {
  background-color: var(--bg-tertiary);
  border-radius: 6px;
  padding: 14px;
  max-height: 200px;
  overflow: auto;
}

.result-content pre {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Form Styles */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.confirm-text {
  color: var(--text-secondary);
  line-height: 1.6;
}

.confirm-text code {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 10px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
  color: var(--accent-orange);
}

/* Color Picker */
.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 150ms ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--text-muted);
}

/* Responsive */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .right-column {
    order: -1;
  }
  
  .snippets-panel {
    max-height: 300px;
  }
}
</style>
