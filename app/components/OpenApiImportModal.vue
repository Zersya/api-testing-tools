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

type TabType = 'file' | 'url' | 'paste';

const activeTab = ref<TabType>('file');
const isLoading = ref(false);
const uploadProgress = ref(0);

const selectedWorkspaceId = ref<string | null>(null);
const selectedProjectId = ref<string | null>(null);
const apiName = ref('');

const urlInput = ref('');
const pasteContent = ref('');

const selectedFile = ref<File | null>(null);
const isDragging = ref(false);

const error = ref<string | null>(null);
const success = ref<{
  definition: {
    id: string;
    name: string;
    specFormat: string;
    sourceUrl: string | null;
    isPublic: boolean;
  };
  parsed: {
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
  activeTab.value = 'file';
  isLoading.value = false;
  uploadProgress.value = 0;
  error.value = null;
  success.value = null;
  urlInput.value = '';
  pasteContent.value = '';
  selectedFile.value = null;
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
      error.value = 'Invalid file type. Please upload a JSON or YAML file.';
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
      error.value = 'Invalid file type. Please upload a JSON or YAML file.';
    }
  }
};

const isValidFile = (file: File) => {
  const validExtensions = ['.json', '.yaml', '.yml'];
  const fileName = file.name.toLowerCase();
  return validExtensions.some(ext => fileName.endsWith(ext));
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

  await importSpec('url', { url: urlInput.value });
};

const handlePasteImport = async () => {
  if (!pasteContent.value.trim()) {
    error.value = 'Please paste OpenAPI specification';
    return;
  }

  await importSpec('raw', { content: pasteContent.value });
};

const handleFileImport = async () => {
  if (!selectedFile.value) {
    error.value = 'Please select a file';
    return;
  }

  await importSpec('file', { file: selectedFile.value });
};

const importSpec = async (source: 'file' | 'url' | 'raw', options: { file?: File; url?: string; content?: string }) => {
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
  if (fileName.endsWith('.json')) return '{ }';
  if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return '☰';
  return '📄';
};
</script>

<template>
  <Modal :show="show" title="Import OpenAPI Specification" size="xl" @close="closeModal">
    <div class="flex flex-col gap-4">
      <div v-if="!success">
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
            @click="activeTab = tab; error = null"
          >
            {{ tab === 'file' ? 'File' : tab === 'url' ? 'URL' : 'Paste' }}
          </button>
        </div>

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

        <div class="mb-4">
          <label>API Name (optional)</label>
          <input 
            v-model="apiName" 
            placeholder="Auto-detected from spec if not provided"
            class="w-full"
          />
        </div>

        <div class="mb-4">
          <div v-if="activeTab === 'file'">
            <label>Upload File</label>
            <div
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
              <input type="file" class="hidden" accept=".json,.yaml,.yml" @change="handleFileSelect" />
              
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
                  Drag & Drop your OpenAPI file here, or 
                  <button class="text-accent-orange hover:underline" @click="($el as HTMLElement).querySelector('input')?.click()">browse</button>
                </div>
                <div class="text-xs text-text-muted">Supports JSON and YAML formats</div>
              </div>
            </div>
          </div>

          <div v-if="activeTab === 'url'">
            <label>Specification URL</label>
            <div class="flex gap-2">
              <input 
                v-model="urlInput" 
                placeholder="https://api.example.com/openapi.json"
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
              Enter a URL to an OpenAPI specification (JSON or YAML)
            </p>
          </div>

          <div v-if="activeTab === 'paste'">
            <label>Paste Specification</label>
            <textarea 
              v-model="pasteContent"
              placeholder='{"openapi": "3.0.0", ...}'
              class="w-full h-48 font-mono text-xs"
            />
            <p class="text-xs text-text-muted mt-2">
              Paste your OpenAPI specification (JSON or YAML format) here
            </p>
          </div>
        </div>

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
          OpenAPI specification "{{ success.definition.name }}" has been imported successfully.
        </p>

        <div class="bg-bg-tertiary rounded-lg p-5 mb-6">
          <h4 class="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Import Summary</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">API Version</div>
              <div class="text-sm font-medium text-text-primary">{{ success.parsed.info.version || 'N/A' }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">OpenAPI Version</div>
              <div class="text-sm font-medium text-text-primary">{{ success.parsed.openApiVersion }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Endpoints</div>
              <div class="text-sm font-medium text-primary">{{ success.parsed.endpointCount }}</div>
            </div>
            <div>
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">Schemas</div>
              <div class="text-sm font-medium text-primary">{{ success.parsed.schemaCount }}</div>
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
          <button class="btn btn-primary w-full" @click="closeModal">View Imported Models</button>
        </div>
      </div>
    </div>

    <template v-if="!success" #footer>
      <button class="btn btn-secondary" @click="closeModal" :disabled="isLoading">Cancel</button>
      <button 
        class="btn btn-primary" 
        @click="activeTab === 'file' ? handleFileImport() : activeTab === 'url' ? handleFetchUrl() : handlePasteImport()"
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