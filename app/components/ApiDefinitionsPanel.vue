<script setup lang="ts">
interface ApiDefinition {
  id: string;
  name: string;
  specFormat: 'openapi3' | 'postman';
  sourceUrl?: string;
  endpointCount: number;
  createdAt: Date;
  updatedAt: Date;
  parsedInfo?: {
    endpoints: Array<{
      method: string;
      path: string;
      summary?: string;
    }>;
  };
}

interface Props {
  workspaceId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  viewDocs: [definition: ApiDefinition];
  generateMocks: [definition: ApiDefinition];
  reimport: [definition: ApiDefinition];
  deleteDefinition: [definition: ApiDefinition];
}>();

const definitions = ref<ApiDefinition[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const fetchDefinitions = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const response = await $fetch<ApiDefinition[]>('/api/definitions');
    definitions.value = response;
  } catch (e: any) {
    error.value = e.message || 'Failed to fetch definitions';
    console.error('Error fetching definitions:', e);
  } finally {
    isLoading.value = false;
  }
};

const handleViewDocs = async (def: ApiDefinition) => {
  try {
    const { data } = await $Fetch<any>(`/api/definitions/${def.id}`);
    emit('viewDocs', { ...def, ...data });
  } catch (e: any) {
    console.error('Error fetching definition details:', e);
    emit('viewDocs', def);
  }
};

const handleGenerateMocks = async (def: ApiDefinition) => {
  try {
    const { data } = await $Fetch<any>(`/api/definitions/${def.id}`);
    emit('generateMocks', { ...def, ...data });
  } catch (e: any) {
    console.error('Error fetching definition details:', e);
    emit('generateMocks', def);
  }
};

const handleDelete = async (def: ApiDefinition) => {
  if (!confirm(`Are you sure you want to delete "${def.name}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await $fetch(`/api/definitions/${def.id}`, { method: 'DELETE' });
    definitions.value = definitions.value.filter(d => d.id !== def.id);
    emit('deleteDefinition', def);
  } catch (e: any) {
    error.value = e.message || 'Failed to delete definition';
    console.error('Error deleting definition:', e);
  }
};

const getFormatLabel = (format: string) => {
  return format === 'openapi3' ? 'OpenAPI' : 'Postman';
};

const getFormatIcon = (format: string) => {
  if (format === 'openapi3') {
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8l-4 4v16z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
  }
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

onMounted(() => {
  fetchDefinitions();
});
</script>

<template>
  <div class="flex flex-col h-full bg-bg-sidebar">
    <div class="flex items-center justify-between py-3 px-3 border-b border-border-default">
      <div class="flex items-center gap-2 text-text-primary text-[13px] font-semibold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>API Definitions</span>
        <span v-if="definitions.length > 0" class="text-[10px] font-medium text-text-muted bg-bg-tertiary py-0.5 px-2 rounded-full">
          {{ definitions.length }}
        </span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="isLoading" class="flex items-center justify-center py-10 text-text-muted text-sm">
        Loading definitions...
      </div>
      
      <div v-else-if="error" class="flex flex-col items-center gap-3 py-10 px-5 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-accent-red opacity-50">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p class="text-[13px] text-text-muted m-0">{{ error }}</p>
        <button @click="fetchDefinitions" class="text-xs text-accent-blue hover:text-accent-blue/80">Retry</button>
      </div>
      
      <div v-else-if="definitions.length === 0" class="flex flex-col items-center gap-3 py-10 px-5 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted opacity-30">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <p class="text-[13px] text-text-muted m-0">No API definitions yet</p>
        <p class="text-[11px] text-text-muted m-0">Import an OpenAPI or Postman spec</p>
      </div>
      
      <div v-else class="p-2 space-y-1">
        <div
          v-for="def in definitions"
          :key="def.id"
          class="p-3 rounded border border-border-default bg-bg-secondary hover:bg-bg-hover transition-all duration-fast group"
        >
          <div class="flex items-start gap-3">
            <div class="flex items-center justify-center w-7 h-7 rounded-md bg-accent-blue/15 text-accent-blue shrink-0" v-html="getFormatIcon(def.specFormat)">
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-medium text-text-muted bg-bg-tertiary py-0.5 px-1.5 rounded">
                  {{ getFormatLabel(def.specFormat) }}
                </span>
                <span class="text-[10px] text-text-muted shrink-0">
                  {{ def.endpointCount }} endpoint{{ def.endpointCount !== 1 ? 's' : '' }}
                </span>
              </div>
              <p class="text-[11px] font-semibold text-text-primary truncate mb-1 m-0">
                {{ def.name }}
              </p>
              <p class="text-[10px] text-text-muted m-0">
                Updated {{ formatTimestamp(def.updatedAt) }}
              </p>
            </div>
          </div>
          
          <div class="mt-2 pt-2 border-t border-border-default flex items-center gap-1">
            <button
              @click="handleViewDocs(def)"
              class="flex items-center gap-1 px-2 py-1 text-[10px] text-text-secondary hover:text-accent-blue hover:bg-bg-hover rounded transition-colors"
              title="View Documentation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>View Docs</span>
            </button>
            <button
              @click="handleGenerateMocks(def)"
              class="flex items-center gap-1 px-2 py-1 text-[10px] text-text-secondary hover:text-accent-green hover:bg-bg-hover rounded transition-colors"
              title="Generate Mocks"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
              </svg>
              <span>Generate Mocks</span>
            </button>
            <button
              @click="emit('reimport', def)"
              class="flex items-center gap-1 px-2 py-1 text-[10px] text-text-secondary hover:text-accent-orange hover:bg-bg-hover rounded transition-colors"
              title="Re-import"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 4v6h6"></path>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              <span>Re-import</span>
            </button>
            <button
              @click="handleDelete(def)"
              class="flex items-center gap-1 px-2 py-1 text-[10px] text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>