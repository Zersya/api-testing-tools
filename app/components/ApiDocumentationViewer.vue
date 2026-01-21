<script setup lang="ts">
import { ParsedOpenAPISpec, OpenAPIEndpoint } from '~/server/utils/openapi-parser';

interface Props {
  show: boolean;
  spec: ParsedOpenAPISpec | null;
  definitionName: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const searchTerm = ref('');
const selectedEndpoint = ref<OpenAPIEndpoint | null>(null);
const expandedTags = ref<Set<string>>(new Set());
const activeLanguage = ref<'curl' | 'javascript' | 'python' | 'http'>('curl');
const isDarkMode = ref(true);

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.classList.toggle('light-theme', !isDarkMode.value);
};

const allTags = computed(() => {
  if (!props.spec?.tags) return [];
  return props.spec.tags;
});

const endpointsByTag = computed(() => {
  if (!props.spec?.endpoints) return {};
  
  const grouped: Record<string, OpenAPIEndpoint[]> = {};
  
  props.spec.endpoints.forEach(endpoint => {
    const tag = endpoint.tags?.[0] || 'default';
    if (!grouped[tag]) {
      grouped[tag] = [];
    }
    grouped[tag].push(endpoint);
  });
  
  return grouped;
});

const filteredEndpointsByTag = computed(() => {
  const grouped: Record<string, OpenAPIEndpoint[]> = {};
  const term = searchTerm.value.toLowerCase();
  
  for (const [tag, endpoints] of Object.entries(endpointsByTag.value)) {
    const filtered = endpoints.filter(ep => {
      const matchesPath = ep.path.toLowerCase().includes(term);
      const matchesSummary = ep.summary?.toLowerCase().includes(term);
      const matchesMethod = ep.method.toLowerCase().includes(term);
      return matchesPath || matchesSummary || matchesMethod;
    });
    
    if (filtered.length > 0) {
      grouped[tag] = filtered;
    }
  }
  
  return grouped;
});

const isTagExpanded = (tag: string) => {
  return expandedTags.value.has(tag);
};

const toggleTag = (tag: string) => {
  if (expandedTags.value.has(tag)) {
    expandedTags.value.delete(tag);
  } else {
    expandedTags.value.add(tag);
  }
};

const selectEndpoint = (endpoint: OpenAPIEndpoint) => {
  selectedEndpoint.value = endpoint;
};

const getCodeExample = computed(() => {
  if (!selectedEndpoint.value || !props.spec?.servers?.[0]) return '';
  
  const ep = selectedEndpoint.value;
  const server = props.spec.servers[0].url;
  const url = `${server}${ep.path}`;
  
  switch (activeLanguage.value) {
    case 'curl':
      return `curl -X ${ep.method} "${url}" \\
  -H "Content-Type: application/json"`;
    
    case 'javascript':
      return `const response = await fetch("${url}", {
  method: "${ep.method}",
  headers: {
    "Content-Type": "application/json"
  }
});

const data = await response.json();`;
    
    case 'python':
      return `import requests

response = requests.${ep.method.toLowerCase()}(
    "${url}",
    headers={"Content-Type": "application/json"}
)

print(response.json())`;
    
    case 'http':
      return `${ep.method} ${ep.path} HTTP/1.1
Host: ${new URL(server).hostname}
Content-Type: application/json`;
  }
});

const copyCode = () => {
  navigator.clipboard.writeText(getCodeExample.value);
};

const groupEndpointsByTags = (endpoints: OpenAPIEndpoint[]) => {
  const grouped: Record<string, OpenAPIEndpoint[]> = {};
  
  endpoints.forEach(endpoint => {
    const tag = endpoint.tags?.[0] || 'default';
    if (!grouped[tag]) {
      grouped[tag] = [];
    }
    grouped[tag].push(endpoint);
  });
  
  return grouped;
};

onMounted(() => {
  expandedTags.value = new Set(Object.keys(endpointsByTag.value));
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="show" 
        class="modal-overlay fixed inset-0 flex items-center justify-center z-[100] bg-black/75 backdrop-blur-[4px]" 
        @click.self="emit('close')"
      >
        <div 
          :class="[
            'bg-bg-secondary border border-border-default rounded-xl shadow-modal w-[calc(100%-32px)] max-h-[90vh] overflow-hidden flex flex-col',
            isDarkMode ? 'dark-theme' : 'light-theme'
          ]"
          style="width: 1200px; max-width: 95vw;"
        >
          <div class="flex-1 flex overflow-hidden min-h-[600px]">
            <div class="flex-1 flex flex-col overflow-hidden">
              <div class="flex items-center justify-between py-3 px-4 border-b border-border-default bg-bg-header">
                <div class="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-orange">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <h2 class="text-base font-semibold text-text-primary m-0">{{ definitionName }}</h2>
                  <span class="text-xs text-text-muted">{{ spec?.info.version }}</span>
                </div>
                
                <button 
                  class="text-text-secondary bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-all duration-fast hover:text-text-primary hover:bg-bg-hover" 
                  @click="emit('close')" 
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div class="flex-1 flex overflow-hidden">
                <div class="w-64 border-r border-border-default flex flex-col bg-bg-sidebar">
                  <div class="flex items-center gap-2 py-2 px-3 border-b border-border-default">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                      v-model="searchTerm"
                      type="text"
                      placeholder="Filter..."
                      class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  
                  <div class="flex-1 overflow-y-auto py-2">
                    <div v-if="Object.keys(filteredEndpointsByTag).length === 0" class="px-3 py-4 text-xs text-text-muted text-center">
                      No endpoints match
                    </div>
                    
                    <div v-else class="space-y-1 px-2">
                      <div 
                        v-for="([tag, endpoints]) in Object.entries(filteredEndpointsByTag)" 
                        :key="tag"
                      >
                        <button
                          @click="toggleTag(tag)"
                          class="w-full flex items-center justify-between py-1.5 px-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <span class="flex items-center gap-1.5">
                            <svg 
                              width="12" 
                              height="12" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              stroke-width="2" 
                              stroke-linecap="round" 
                              stroke-linejoin="round"
                              :class="{ 'rotate-90': isTagExpanded(tag) }"
                              class="transition-transform duration-fast"
                            >
                              <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                            <span>{{ tag === 'default' ? 'General' : tag }}</span>
                          </span>
                          <span class="text-[10px] text-text-muted">{{ endpoints.length }}</span>
                        </button>
                        
                        <div v-if="isTagExpanded(tag)" class="mt-1 space-y-0.5 pl-4 border-l border-border-subtle">
                          <button
                            v-for="endpoint in endpoints"
                            :key="`${endpoint.method}:${endpoint.path}`"
                            @click="selectEndpoint(endpoint)"
                            :class="[
                              'w-full flex items-center gap-2 py-1.5 px-2 text-left rounded-md transition-all duration-fast text-[11px]',
                              selectedEndpoint?.path === endpoint.path && selectedEndpoint?.method === endpoint.method
                                ? 'bg-bg-hover text-text-primary border-l-2 border-accent-orange -ml-2 pl-4'
                                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                            ]"
                          >
                            <MethodBadge :method="endpoint.method" size="sm" />
                            <span class="truncate font-mono">{{ endpoint.path }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="flex-1 flex flex-col overflow-hidden">
                  <div v-if="selectedEndpoint" class="flex-1 flex overflow-y-auto">
                    <div class="flex-1 p-5 overflow-y-auto">
                      <div class="mb-4 pb-3 border-b border-border-default">
                        <h3 class="text-lg font-semibold text-text-primary mb-1 flex items-center gap-2">
                          <MethodBadge :method="selectedEndpoint.method" size="lg" />
                          <span class="font-mono">{{ selectedEndpoint.path }}</span>
                        </h3>
                        <p v-if="selectedEndpoint.summary" class="text-sm text-text-secondary m-0">{{ selectedEndpoint.summary }}</p>
                        <p v-else-if="selectedEndpoint.description" class="text-sm text-text-secondary m-0">{{ selectedEndpoint.description }}</p>
                      </div>
                      
                      <div v-if="selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0" class="mb-4">
                        <h4 class="text-xs font-semibold text-text-primary uppercase tracking-wide mb-2">Parameters</h4>
                        <div class="bg-bg-tertiary border border-border-default rounded-md divide-y divide-border-default">
                          <div 
                            v-for="param in selectedEndpoint.parameters" 
                            :key="`${param.in}:${param.name}`"
                            class="p-2.5 flex items-start gap-3"
                          >
                            <div class="flex items-center gap-2 min-w-0">
                              <span class="font-mono text-xs text-text-primary">{{ param.name }}</span>
                              <span 
                                :class="[
                                  'text-[10px] px-1 py-0.5 rounded',
                                  param.required ? 'bg-accent-red/15 text-accent-red' : 'bg-bg-hover text-text-muted'
                                ]"
                              >
                                {{ param.in }}
                              </span>
                            </div>
                            <div v-if="param.description" class="text-[11px] text-text-muted flex-1">
                              {{ param.description }}
                            </div>
                            <div v-if="param.required" class="text-[10px] text-accent-red">required</div>
                          </div>
                        </div>
                      </div>
                      
                      <div v-if="selectedEndpoint.requestBody" class="mb-4">
                        <h4 class="text-xs font-semibold text-text-primary uppercase tracking-wide mb-2">Request Body</h4>
                        <div class="bg-bg-tertiary border border-border-default rounded-md p-3">
                          <div v-if="selectedEndpoint.requestBody.description" class="text-[11px] text-text-secondary mb-2">
                            {{ selectedEndpoint.requestBody.description }}
                          </div>
                          <div v-if="selectedEndpoint.requestBody.content" class="space-y-2">
                            <div 
                              v-for="([contentType, mediaType], idx) in Object.entries(selectedEndpoint.requestBody.content)" 
                              :key="idx"
                            >
                              <span class="inline-block px-2 py-1 bg-bg-hover text-text-primary text-[10px] rounded font-mono">
                                {{ contentType }}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div v-if="selectedEndpoint.responses" class="mb-4">
                        <h4 class="text-xs font-semibold text-text-primary uppercase tracking-wide mb-2">Responses</h4>
                        <div class="space-y-2">
                          <div 
                            v-for="([statusCode, response], idx) in Object.entries(selectedEndpoint.responses)" 
                            :key="idx"
                            class="bg-bg-tertiary border border-border-default rounded-md overflow-hidden"
                          >
                            <div class="p-2.5 border-b border-border-default flex items-center gap-3">
                              <span 
                                :class="[
                                  'text-xs font-bold font-mono px-2 py-0.5 rounded',
                                  statusCode.startsWith('2') ? 'bg-accent-green/15 text-accent-green' :
                                  statusCode.startsWith('3') ? 'bg-accent-blue/15 text-accent-blue' :
                                  statusCode.startsWith('4') ? 'bg-accent-yellow/15 text-accent-yellow' :
                                  'bg-accent-red/15 text-accent-red'
                                ]"
                              >
                                {{ statusCode }}
                              </span>
                              <span class="text-xs text-text-secondary">{{ response.description }}</span>
                            </div>
                            <div v-if="response.content && Object.keys(response.content).length > 0" class="p-3">
                              <div 
                                v-for="([contentType, mediaType], idx) in Object.entries(response.content)" 
                                :key="idx"
                                class="mb-2 last:mb-0"
                              >
                                <span class="inline-block px-2 py-1 bg-bg-hover text-text-primary text-[10px] rounded font-mono mb-2">
                                  {{ contentType }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div v-if="selectedEndpoint.tags && selectedEndpoint.tags.length > 0" class="flex flex-wrap gap-2">
                        <h4 class="text-xs font-semibold text-text-primary uppercase tracking-wide">Tags</h4>
                        <div class="flex flex-wrap gap-1.5">
                          <span 
                            v-for="tag in selectedEndpoint.tags" 
                            :key="tag"
                            class="inline-block px-2 py-1 bg-bg-tertiary text-text-secondary text-[10px] rounded"
                          >
                            {{ tag }}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="w-80 border-l border-border-default bg-bg-sidebar flex flex-col">
                      <div class="p-3 border-b border-border-default flex items-center justify-between">
                        <span class="text-xs font-semibold text-text-primary uppercase tracking-wide">Code Examples</span>
                        <button 
                          @click="toggleTheme"
                          class="text-text-secondary bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-all duration-fast hover:text-text-primary hover:bg-bg-hover"
                          title="Toggle theme"
                        >
                          <svg v-if="isDarkMode" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                          </svg>
                          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                          </svg>
                        </button>
                      </div>
                      
                      <div class="flex border-b border-border-default">
                        <button 
                          v-for="lang in ['curl', 'javascript', 'python', 'http']"
                          :key="lang"
                          :class="[
                            'flex-1 py-2 px-3 bg-transparent border-none border-b-2 text-[11px] font-medium cursor-pointer -mb-px transition-all duration-fast',
                            activeLanguage === lang ? 'text-accent-orange border-b-accent-orange' : 'text-text-secondary border-b-transparent hover:text-text-primary hover:bg-bg-hover'
                          ]"
                          @click="activeLanguage = lang"
                        >
                          {{ lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : 'HTTP' }}
                        </button>
                      </div>
                      
                      <div class="flex-1 overflow-auto p-3 bg-bg-tertiary">
                        <pre v-if="getCodeExample" class="font-mono text-[10px] leading-normal text-text-primary m-0 whitespace-pre-wrap break-words">{{ getCodeExample }}</pre>
                        <div v-else class="text-xs text-text-muted h-full flex items-center justify-center">
                          Select an endpoint to see code examples
                        </div>
                      </div>
                      
                      <div v-if="getCodeExample" class="p-3 border-t border-border-default">
                        <button 
                          @click="copyCode"
                          class="btn btn-secondary btn-sm w-full"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy Code
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div v-else class="flex-1 flex items-center justify-center text-text-muted">
                    <div class="text-center">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="opacity-30 mx-auto mb-3">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                      </svg>
                      <p class="text-sm">Select an endpoint from the sidebar to view documentation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 200ms ease, opacity 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>