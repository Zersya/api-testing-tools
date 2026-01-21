<script setup lang="ts">
import type { WorkspaceWithProjects } from './AppSidebar.vue';

interface Props {
  show: boolean;
  workspaces: WorkspaceWithProjects[];
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  workspaces: () => []
});

const emit = defineEmits<{
  close: [];
  importComplete: [];
}>();

type ImportType = 'openapi' | 'postman';
type TabType = 'file' | 'url' | 'paste';

const activeImportType = ref<ImportType>('openapi');
const activeTab = ref<TabType>('file');
const isLoading = ref(false);
const uploadProgress = ref(0);

const selectedWorkspaceId = ref<string | null>(null);
const selectedProjectId = ref<string | null>(null);
const apiName = ref('');
const importEnvironments = ref(true);

const urlInput = ref('');
const pasteContent = ref('');
const envUrlInput = ref('');
const envPasteContent = ref('');

const selectedFile = ref<File | null>(null);
const selectedEnvFile = ref<File | null>(null);
const isDragging = ref(false);

const error = ref<string | null>(null);
const success = ref<{
  collection?: {
    id: string;
    name: string;
    description: string | null;
  };
  stats?: {
    foldersCreated: number;
    requestsCreated: number;
    environmentsCreated: number;
    variablesCreated: number;
  };
  definition?: {
    id: string;
    name: string;
    specFormat: string;
    sourceUrl: string | null;
    isPublic: boolean;
  };
  parsed?: {
    info: { title: string; version?: string };
    openApiVersion: string;
    endpointCount: number;
    schemaCount: number;
  };
  warnings: Array<{ path: string; message: string }>;
} | null>(null);

const currentWorkspace = computed(() => {
  if (!selectedWorkspaceId.value) return props.workspaces[0];
  return props.workspaces.find(w => w.id === selectedWorkspaceId.value) || props.workspaces[0];
});

const currentProject = computed(() => {
  if (!selectedProjectId.value && currentWorkspace.value) {
    return currentWorkspace.value.projects[0];
  }
  return currentWorkspace.value?.projects.find(p => p.id === selectedProjectId.value) || null;
});

onMounted(() => {
  if (props.workspaces.length > 0) {
    selectedWorkspaceId.value = props.workspaces[0].id;
    if (props.workspaces[0].projects.length > 0) {
      selectedProjectId.value = props.workspaces[0].projects[0].id;
    }
  }
});

const resetForm = () => {
  activeImportType.value = 'openapi';
  activeTab.value = 'file';
  isLoading.value = false;
  uploadProgress.value = 0;
  error.value = null;
  success.value = null;
  urlInput.value = '';
  pasteContent.value = '';
  envUrlInput.value = '';
  envPasteContent.value = '';
  selectedFile.value = null;
  selectedEnvFile.value = null;
  importEnvironments.value = true;
};

const closeModal = () => {
  emit('close');
  setTimeout(resetForm, 300);
};

const handleFileDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (isValidFile(file)) {
      selectedFile.value = file;
      error.value = null;
    } else {
      error.value = 'Invalid file type. Please upload a valid file.';
    }
  }
};

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    if (isValidFile(file)) {
      selectedFile.value = file;
      error.value = null;
    } else {
      error.value = 'Invalid file type. Please upload a valid file.';
    }
  }
};

const handleEnvFileDrop = (e: DragEvent) => {
  e.preventDefault();
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    const fileLower = file.name.toLowerCase();
    if (fileLower.includes('env') || fileLower.endsWith('.json')) {
      selectedEnvFile.value = file;
      error.value = null;
    } else {
      error.value = 'Please upload a valid environment file (JSON)';
    }
  }
};

const handleEnvFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedEnvFile.value = target.files[0];
    error.value = null;
  }
};

const isValidFile = (file: File) => {
  const fileName = file.name.toLowerCase();
  if (activeImportType.value === 'openapi') {
    return fileName.endsWith('.json') || fileName.endsWith('.yaml') || fileName.endsWith('.yml');
  } else {
    return fileName.endsWith('.json');
  }
};

const handleFetchUrl = async () => {
  if (!urlInput.value) {
    error.value = 'Please enter a URL';
    return;
  }

  try {
    new URL(urlInput.value);
  } catch {
    error.value = 'Invalid URL format';
    return;
  }

  if (activeImportType.value === 'openapi') {
    await importOpenApi('url', { url: urlInput.value });
  } else {
    await importPostman('url', { url: urlInput.value });
  }
};

const handleFetchEnvUrl = async () => {
  if (!envUrlInput.value) {
    error.value = 'Please enter a URL';
    return;
  }

  try {
    new URL(envUrlInput.value);
  } catch {
    error.value = 'Invalid URL format';
    return;
  }

  error.value = null;
};

const handlePasteImport = async () => {
  if (!pasteContent.value.trim()) {
    error.value = 'Please paste the content';
    return;
  }

  if (activeImportType.value === 'openapi') {
    await importOpenApi('raw', { content: pasteContent.value });
  } else {
    await importPostman('raw', { content: pasteContent.value });
  }
};

const handleFileImport = async () => {
  if (!selectedFile.value) {
    error.value = 'Please select a file';
    return;
  }

  if (activeImportType.value === 'openapi') {
    await importOpenApi('file', { file: selectedFile.value });
  } else {
    await importPostman('file', { file: selectedFile.value });
  }
};

const importOpenApi = async (source: 'file' | 'url' | 'raw', options: { file?: File; url?: string; content?: string }) => {
  if (!currentProject.value) {
    error.value = 'Please select a project';
    return;
  }

  isLoading.value = true;
  uploadProgress.value = 0;
  error.value = null;
  success.value = null;

  const formData = new FormData();
  formData.append('projectId', currentProject.value.id);
  
  if (apiName.value) {
    formData.append('name', apiName.value);
  }

  try {
    if (source === 'file' && options.file) {
      formData.append('file', options.file);
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          uploadProgress.value = (e.loaded / e.total) * 100;
        }
      });

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(xhr.statusText));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        
        xhr.open('POST', '/api/definitions/import');
        xhr.send(formData);
      });

      const response = JSON.parse(xhr.response);
      if (response.success) {
        success.value = response;
        emit('importComplete');
      } else {
        error.value = response.error?.message || 'Import failed';
      }
      
    } else {
      const body = {
        projectId: currentProject.value.id,
        source,
        name: apiName.value || undefined,
        ...options
      };

      uploadProgress.value = 50;

      const response = await $fetch('/api/definitions/import', {
        method: 'POST',
        body
      });

      uploadProgress.value = 100;

      if (response.success) {
        success.value = response;
        emit('importComplete');
      } else {
        error.value = response.error?.message || 'Import failed';
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to import specification';
  } finally {
    isLoading.value = false;
  }
};

const importPostman = async (source: 'file' | 'url' | 'raw', options: { file?: File; url?: string; content?: string }) => {
  if (!currentProject.value) {
    error.value = 'Please select a project';
    return;
  }

  isLoading.value = true;
  uploadProgress.value = 0;
  error.value = null;
  success.value = null;

  const formData = new FormData();
  formData.append('projectId', currentProject.value.id);
  
  if (apiName.value) {
    formData.append('name', apiName.value);
  }
  
  formData.append('importEnvironments', importEnvironments.value.toString());

  try {
    if (source === 'file' && options.file) {
      formData.append('file', options.file);
      
      if (selectedEnvFile.value) {
        const envContent = await selectedEnvFile.value.text();
        formData.append('environments', envContent);
      } else if (envPasteContent.value.trim()) {
        formData.append('environments', envPasteContent.value);
      } else if (envUrlInput.value) {
        formData.append('environments', envUrlInput.value);
      }
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          uploadProgress.value = (e.loaded / e.total) * 100;
        }
      });

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error(xhr.statusText));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        
        xhr.open('POST', '/api/definitions/import/postman');
        xhr.send(formData);
      });

      const response = JSON.parse(xhr.response);
      if (response.success) {
        success.value = response;
        emit('importComplete');
      } else {
        error.value = response.error?.message || 'Import failed';
      }
      
    } else {
      let envString = '';
      
      if (selectedEnvFile.value) {
        envString = await selectedEnvFile.value.text();
      } else if (envPasteContent.value.trim()) {
        envString = envPasteContent.value;
      } else if (envUrlInput.value) {
        envString = envUrlInput.value;
      }

      const body = {
        projectId: currentProject.value.id,
        source,
        name: apiName.value || undefined,
        importEnvironments: importEnvironments.value,
        environments: envString || undefined,
        ...options
      };

      uploadProgress.value = 50;

      const response = await $fetch('/api/definitions/import/postman', {
        method: 'POST',
        body
      });

      uploadProgress.value = 100;

      if (response.success) {
        success.value = response;
        emit('importComplete');
      } else {
        error.value = response.error?.message || 'Import failed';
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to import Postman collection';
  } finally {
    isLoading.value = false;
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const getFileIcon = () => {
  if (!selectedFile.value) return '';
  const fileName = selectedFile.value.name.toLowerCase();
  if (activeImportType.value === 'openapi') {
    if (fileName.endsWith('.json')) return '{ }';
    if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return '☰';
  } else {
    return '📦';
  }
  return '📄';
};

const switchImportType = (type: ImportType) => {
  activeImportType.value = type;
  activeTab.value = 'file';
  resetFileState();
};

const switchTab = (tab: TabType) => {
  activeTab.value = tab;
  error.value = null;
};

const resetFileState = () => {
  selectedFile.value = null;
  selectedEnvFile.value = null;
  urlInput.value = '';
  pasteContent.value = '';
  envUrlInput.value = '';
  envPasteContent.value = '';
  error.value = null;
};

const fileInputRef = ref<HTMLElement | null>(null);
const envFileInputRef = ref<HTMLElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.querySelector('input')?.click();
};

const triggerEnvFileInput = () => {
  envFileInputRef.value?.querySelector('input')?.click();
};
</script>

<template>
  <Modal :show="show" title="Import API Specification" size="xl" @close="closeModal">
    <div class="flex flex-col gap-4">
      <div v-if="!success">
        <!-- Import Type Tabs -->
        <div class="flex gap-1 mb-4 border-b border-border-default">
          <button
            v-for="type in ['openapi', 'postman'] as ImportType[]"
            :key="type"
            :class="[
              'flex-1 py-2.5 px-4 text-sm font-medium cursor-pointer -mb-px border-b-2 transition-all duration-fast uppercase tracking-wide',
              activeImportType === type 
                ? 'text-accent-orange border-b-accent-orange' 
                : 'text-text-secondary border-b-transparent hover:text-text-primary hover:bg-bg-hover'
            ]"
            @click="switchImportType(type); error = null"
          >
            {{ type === 'openapi' ? 'OpenAPI' : 'Postman' }}
          </button>
        </div>

        <!-- Method Tabs -->
        <div class="flex gap-1 mb-4 border-b border-border-default">
          <button
            v-for="tab in ['file', 'url', 'paste'] as TabType[]"
            :key="tab"
            :class="[
              'flex-1 py-2.5 px-4 text-sm font-medium cursor-pointer -mb-px border-b-2 transition-all duration-fast uppercase tracking-wide',
              activeTab === tab 
                ? 'text-accent-orange border-b-accent-orange' 
                : 'text-text-secondary border-b-transparent hover:text-text-primary hover:bg-bg-hover'
            ]"
            @click="switchTab(tab)"
          >
            {{ tab === 'file' ? 'File' : tab === 'url' ? 'URL' : 'Paste' }}
          </button>
        </div>

        <!-- Workspace & Project Selection -->
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label>Workspace</label>
            <select 
              v-model="selectedWorkspaceId" 
              class="w-full"
              @change="selectedProjectId = workspaces.find(w => w.id === selectedWorkspaceId)?.projects[0]?.id || null"
            >
              <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
                {{ workspace.name }}
              </option>
            </select>
          </div>
          <div>
            <label>Project</label>
            <select v-model="selectedProjectId" class="w-full">
              <option v-for="project in currentWorkspace?.projects || []" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Collection Name -->
        <div class="mb-4">
          <label>{{ activeImportType === 'openapi' ? 'API Name (optional)' : 'Collection Name (optional)' }}</label>
          <input 
            v-model="apiName" 
            :placeholder="activeImportType === 'openapi' ? 'Auto-detected from spec if not provided' : 'Auto-detected from collection if not provided'"
            class="w-full"
          />
        </div>

        <!-- Postman Environment Settings -->
        <div v-if="activeImportType === 'postman'" class="mb-4 p-3 bg-bg-tertiary rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              v-model="importEnvironments"
              class="w-4 h-4 rounded border-border-default accent-accent-orange"
            />
            <span class="text-sm text-text-primary">Import Postman environments</span>
          </label>
          <p class="text-xs text-text-muted mt-1">
            Import variables from the collection and separate environment files
          </p>
        </div>

        <!-- File Input Area -->
        <div v-if="activeTab === 'file'" class="mb-4">
          <label>{{ activeImportType === 'openapi' ? 'Upload OpenAPI Spec' : 'Upload Postman Collection' }}</label>
          <div
            ref="fileInputRef"
            :class="[
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-fast',
              isDragging 
                ? 'border-accent-orange bg-accent-orange/5' 
                : selectedFile 
                  ? 'border-accent-green bg-accent-green/5' 
                  : 'border-border-default hover:border-border-subtle hover:bg-bg-hover'
            ]"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleFileDrop"
          >
            <input type="file" class="hidden" :accept="activeImportType === 'openapi' ? '.json,.yaml,.yml' : '.json'" @change="handleFileSelect" />
            
            <div v-if="selectedFile" class="flex flex-col items-center gap-3">
              <div class="text-4xl">{{ getFileIcon() }}</div>
              <div class="text-sm font-medium text-text-primary">{{ selectedFile.name }}</div>
              <div class="text-xs text-text-muted">{{ (selectedFile.size / 1024).toFixed(2) }} KB</div>
              <button 
                @click="selectedFile = null; error = null"
                class="btn btn-sm btn-ghost hover:bg-accent-red/10 hover:text-accent-red"
              >
                Remove
              </button>
            </div>
            
            <div v-else class="flex flex-col items-center gap-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-text-muted opacity-50">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <div class="text-sm text-text-secondary">
                Drag & Drop your file here, or 
                <button class="text-accent-orange hover:underline" @click="triggerFileInput">browse</button>
              </div>
              <div class="text-xs text-text-muted">
                {{ activeImportType === 'openapi' ? 'Supports JSON and YAML formats' : 'Supports Postman Collection v2.x (JSON)' }}
              </div>
            </div>
          </div>

          <!-- Postman Environment File Upload -->
          <div v-if="activeImportType === 'postman' && importEnvironments" class="mt-4">
            <label class="text-xs text-text-muted">Postman Environment JSON (optional)</label>
            <div
              ref="envFileInputRef"
              :class="[
                'relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-fast mt-2',
                selectedEnvFile ? 'border-accent-green bg-accent-green/5' : 'border-border-default hover:border-border-subtle hover:bg-bg-hover'
              ]"
              @dragover="(e) => { e.preventDefault(); }"
              @drop="handleEnvFileDrop"
            >
              <input type="file" class="hidden" accept=".json" @change="handleEnvFileSelect" />
              
              <div v-if="selectedEnvFile" class="flex flex-col items-center gap-2">
                <div class="text-3xl">🌍</div>
                <div class="text-xs font-medium text-text-primary">{{ selectedEnvFile.name }}</div>
                <button 
                  @click="selectedEnvFile = null; error = null"
                  class="text-xs text-accent-red hover:underline"
                >
                  Remove
                </button>
              </div>
              
              <div v-else class="text-xs text-text-muted">
                Drag & Drop environment file, or 
                <button @click="triggerEnvFileInput" class="text-accent-orange hover:underline">browse</button>
              </div>
            </div>
          </div>
        </div>

        <!-- URL Input Area -->
        <div v-if="activeTab === 'url'" class="mb-4">
          <label>{{ activeImportType === 'openapi' ? 'Specification URL' : 'Collection URL' }}</label>
          <div class="flex gap-2">
            <input 
              v-model="urlInput" 
              :placeholder="activeImportType === 'openapi' ? 'https://api.example.com/openapi.json' : 'https://api.postman.com/collections/...'"
              class="flex-1"
              @keypress.enter="handleFetchUrl"
            />
            <button 
              class="btn btn-secondary" 
              @click="handleFetchUrl"
              :disabled="isLoading || !urlInput"
            >
              <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="21 8 21 21 8 21"></polyline>
                <path d="M21 3L10 14"></path>
              </svg>
              Fetch
            </button>
          </div>
          <p class="text-xs text-text-muted mt-2">
            {{ activeImportType === 'openapi' ? 'Enter a URL to an OpenAPI specification (JSON or YAML)' : 'Enter a URL to a Postman collection' }}
          </p>

          <!-- Postman Environment URL -->
          <div v-if="activeImportType === 'postman' && importEnvironments" class="mt-4">
            <label class="text-xs text-text-muted">Environment URL (optional)</label>
            <input 
              v-model="envUrlInput"
              placeholder="https://api.postman.com/environments/..."
              class="w-full mt-2"
              @keyup.enter="handleFetchEnvUrl"
            />
          </div>
        </div>

        <!-- Paste Area -->
        <div v-if="activeTab === 'paste'" class="mb-4">
          <label>{{ activeImportType === 'openapi' ? 'Paste OpenAPI Specification' : 'Paste Postman Collection' }}</label>
          <textarea 
            v-model="pasteContent"
            :placeholder="activeImportType === 'openapi' ? '{&quot;openapi&quot;: &quot;3.0.0&quot;, ...}' : '{&quot;info&quot;: {&quot;name&quot;: &quot;My API&quot;}, &quot;item&quot;: [...]}'"
            class="w-full h-48 font-mono text-xs"
          />
          <p class="text-xs text-text-muted mt-2">
            {{ activeImportType === 'openapi' ? 'Paste your OpenAPI specification (JSON or YAML format)' : 'Paste your Postman collection export (JSON format)' }}
          </p>

          <!-- Postman Environment Paste -->
          <div v-if="activeImportType === 'postman' && importEnvironments" class="mt-4">
            <label class="text-xs text-text-muted">Paste Environment JSON (optional)</label>
            <textarea 
              v-model="envPasteContent"
              placeholder='{"name": "Production", "values": [...]}'
              class="w-full h-32 font-mono text-xs mt-2"
            />
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg mb-4">
          <div class="flex items-start gap-2">
            <svg class="text-accent-red flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="text-sm text-accent-red">{{ error }}</div>
          </div>
        </div>

        <!-- Progress Indicator -->
        <div v-if="isLoading" class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-text-secondary">Importing specification...</span>
            <span class="text-xs font-medium text-primary">{{ Math.round(uploadProgress) }}%</span>
          </div>
          <div class="h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div 
              class="h-full bg-accent-orange transition-all duration-300 ease-out"
              :style="{ width: uploadProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Success Display -->
      <div v-else class="py-6">
        <div class="flex items-center justify-center mb-6">
          <div class="w-16 h-16 bg-accent-green/20 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-green">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
        <h3 class="text-lg font-semibold text-text-primary text-center mb-2">Import Successful!</h3>
        <p class="text-sm text-text-secondary text-center mb-6">
          {{ activeImportType === 'openapi' 
            ? `OpenAPI specification "${success.definition?.name}" has been imported successfully.`
            : `Postman collection "${success.collection?.name}" has been imported successfully.`
          }}
        </p>

        <div class="bg-bg-tertiary rounded-lg p-5 mb-6">
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Import Summary</h4>
          
          <div v-if="activeImportType === 'openapi'" class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">API Version</div>
              <div class="text-sm font-medium text-text-primary">{{ success.parsed?.info.version || 'N/A' }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">OpenAPI Version</div>
              <div class="text-sm font-medium text-text-primary">{{ success.parsed?.openApiVersion }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Endpoints</div>
              <div class="text-sm font-medium text-primary">{{ success.parsed?.endpointCount }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Schemas</div>
              <div class="text-sm font-medium text-primary">{{ success.parsed?.schemaCount }}</div>
            </div>
          </div>

          <div v-else class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Folders Created</div>
              <div class="text-sm font-medium text-primary">{{ success.stats?.foldersCreated }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Requests Created</div>
              <div class="text-sm font-medium text-primary">{{ success.stats?.requestsCreated }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Environments Created</div>
              <div class="text-sm font-medium text-primary">{{ success.stats?.environmentsCreated }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Variables Created</div>
              <div class="text-sm font-medium text-primary">{{ success.stats?.variablesCreated }}</div>
            </div>
          </div>

          <div v-if="success.warnings && success.warnings.length > 0" class="mt-4 pt-4 border-t border-border-default">
            <div class="text-[10px] text-accent-yellow uppercase tracking-wide mb-2">Warnings ({{ success.warnings.length }})</div>
            <div class="max-h-24 overflow-y-auto">
              <div v-for="(warning, i) in success.warnings" :key="i" class="text-xs text-text-secondary mb-1">
                <span class="font-mono text-text-muted">{{ warning.path }}:</span> {{ warning.message }}
              </div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button class="btn btn-primary w-full" @click="closeModal">View Imported Content</button>
        </div>
      </div>
    </div>

    <template v-if="!success" #footer>
      <button class="btn btn-secondary" @click="closeModal" :disabled="isLoading">Cancel</button>
      <button 
        class="btn btn-primary" 
        @click="activeTab === 'url' ? handleFetchUrl() : activeTab === 'paste' ? handlePasteImport() : handleFileImport()"
        :disabled="isLoading || 
                  (activeTab === 'file' && !selectedFile) ||
                  (activeTab === 'url' && !urlInput) ||
                  (activeTab === 'paste' && !pasteContent)"
      >
        <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        {{ isLoading ? 'Importing...' : 'Import' }}
      </button>
    </template>
  </Modal>
</template>