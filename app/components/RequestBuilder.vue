<script setup lang="ts">
interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface HeaderParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface BodyParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type: 'text' | 'file';
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

interface ProxyResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  timing: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

interface ProxyErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    cause?: string;
  };
  timing: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

interface Props {
  request: HttpRequest;
  workspaceId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  saveRequest: [request: HttpRequest];
}>();

type TabType = 'params' | 'headers' | 'body' | 'response';
type BodyFormat = 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;
const COMMON_HEADERS = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'DNT',
  'Host',
  'Origin',
  'Referer',
  'User-Agent',
  'X-Requested-With',
  'API-Key',
  'X-API-Key',
  'Bearer'
] as const;

const methodColors: Record<string, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  DELETE: 'text-method-delete',
  PATCH: 'text-method-patch',
  HEAD: 'text-method-head',
  OPTIONS: 'text-method-options'
};

const BODY_FORMATS = ['none', 'json', 'form-data', 'urlencoded', 'raw', 'binary'] as const;
const RAW_CONTENT_TYPES = [
  'text/plain',
  'text/html',
  'text/xml',
  'application/json',
  'application/javascript',
  'application/xml'
] as const;

const form = ref({
  method: props.request.method as typeof HTTP_METHODS[number],
  url: props.request.url
});

const activeTab = ref<TabType>('params');
const isLoading = ref(false);
const response = ref<ProxyResponse | ProxyErrorResponse | null>(null);
const variableWarnings = ref<string[]>([]);

const queryParams = ref<QueryParam[]>([]);
const isBulkEditMode = ref(false);
const bulkQueryString = ref('');

const headers = ref<HeaderParam[]>([]);

const bodyFormat = ref<BodyFormat>('none');
const jsonBody = ref('');
const formDataParams = ref<BodyParam[]>([]);
const rawBody = ref('');
const rawContentType = ref('text/plain');
const binaryFile = ref<File | null>(null);

const parseUrlQuery = (url: string) => {
  try {
    const urlObj = new URL(url);
    const params: QueryParam[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({
        id: crypto.randomUUID(),
        key,
        value,
        enabled: true
      });
    });
    return params;
  } catch {
    return [];
  }
};

const updateUrlFromParams = () => {
  try {
    const urlObj = new URL(form.value.url);
    urlObj.search = '';
    
    queryParams.value.forEach(param => {
      if (param.enabled && param.key) {
        urlObj.searchParams.append(param.key, param.value);
      }
    });
    
    form.value.url = urlObj.toString();
  } catch {
  }
};

const parseBulkQuery = () => {
  const params: QueryParam[] = [];
  const pairs = bulkQueryString.value.split('&').filter(Boolean);
  
  pairs.forEach(pair => {
    const [key, ...values] = pair.split('=');
    const value = values.join('=');
    if (key) {
      params.push({
        id: crypto.randomUUID(),
        key,
        value: decodeURIComponent(value),
        enabled: true
      });
    }
  });
  
  queryParams.value = params;
  updateUrlFromParams();
  isBulkEditMode.value = false;
};

const generateBulkQuery = () => {
  const enabledParams = queryParams.value.filter(p => p.enabled && p.key);
  bulkQueryString.value = enabledParams
    .map(p => `${p.key}=${encodeURIComponent(p.value)}`)
    .join('&');
  isBulkEditMode.value = true;
};

const addQueryParam = () => {
  queryParams.value.push({
    id: crypto.randomUUID(),
    key: '',
    value: '',
    enabled: true
  });
};

const removeQueryParam = (id: string) => {
  const index = queryParams.value.findIndex(p => p.id === id);
  if (index !== -1) {
    queryParams.value.splice(index, 1);
    updateUrlFromParams();
  }
};

const updateQueryParam = (id: string, field: keyof QueryParam, value: string | boolean) => {
  const param = queryParams.value.find(p => p.id === id);
  if (param) {
    param[field] = value as never;
    updateUrlFromParams();
  }
};

const parseHeadersFromRequest = (headersObj: Record<string, string> | null) => {
  if (!headersObj) return [];
  return Object.entries(headersObj).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value,
    enabled: true
  }));
};

const addHeader = () => {
  headers.value.push({
    id: crypto.randomUUID(),
    key: '',
    value: '',
    enabled: true
  });
};

const removeHeader = (id: string) => {
  const index = headers.value.findIndex(h => h.id === id);
  if (index !== -1) {
    headers.value.splice(index, 1);
  }
};

const updateHeader = (id: string, field: keyof HeaderParam, value: string | boolean) => {
  const header = headers.value.find(h => h.id === id);
  if (header) {
    header[field] = value as never;
  }
};

const addPresetHeaders = () => {
  const presetHeaders = [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Accept', value: 'application/json' }
  ];

  presetHeaders.forEach(preset => {
    const existingHeader = headers.value.find(h => 
      h.key.toLowerCase() === preset.key.toLowerCase()
    );

    if (existingHeader) {
      existingHeader.value = preset.value;
      existingHeader.enabled = true;
    } else {
      headers.value.push({
        id: crypto.randomUUID(),
        key: preset.key,
        value: preset.value,
        enabled: true
      });
    }
  });
};

const buildHeadersRecord = (): Record<string, string> => {
  const headersRecord: Record<string, string> = {};
  headers.value.forEach(header => {
    if (header.enabled && header.key) {
      headersRecord[header.key] = header.value;
    }
  });
  return headersRecord;
};

const addFormDataParam = () => {
  formDataParams.value.push({
    id: crypto.randomUUID(),
    key: '',
    value: '',
    enabled: true,
    type: 'text'
  });
};

const removeFormDataParam = (id: string) => {
  const index = formDataParams.value.findIndex(p => p.id === id);
  if (index !== -1) {
    formDataParams.value.splice(index, 1);
  }
};

const updateFormDataParam = (id: string, field: keyof BodyParam, value: string | boolean | 'text' | 'file') => {
  const param = formDataParams.value.find(p => p.id === id);
  if (param) {
    param[field] = value as never;
  }
};

const handleFileSelect = (id: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const param = formDataParams.value.find(p => p.id === id);
    if (param) {
      param.value = target.files[0].name;
    }
  }
};

const handleBinaryFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    binaryFile.value = target.files[0];
  }
};

const validateJson = (jsonString: string): { valid: boolean; error?: string } => {
  try {
    if (jsonString.trim() === '') {
      return { valid: true };
    }
    JSON.parse(jsonString);
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
};

const buildBody = (): any => {
  switch (bodyFormat.value) {
    case 'none':
      return undefined;
    case 'json':
      try {
        return JSON.parse(jsonBody.value);
      } catch {
        return jsonBody.value;
      }
    case 'form-data':
      const formData = new FormData();
      formDataParams.value.forEach(param => {
        if (param.enabled && param.key) {
          formData.append(param.key, param.value);
        }
      });
      return formData;
    case 'urlencoded':
      const enabledParams = formDataParams.value.filter(p => p.enabled && p.key);
      const params = new URLSearchParams();
      enabledParams.forEach(param => {
        params.append(param.key, param.value);
      });
      return params.toString();
    case 'raw':
      return rawBody.value;
    case 'binary':
      return binaryFile.value;
    default:
      return undefined;
  }
};

watch(() => form.value.url, (newUrl) => {
  const params = parseUrlQuery(newUrl);
  if (params.length !== queryParams.value.length ||
      JSON.stringify(params) !== JSON.stringify(queryParams.value.map(p => ({ key: p.key, value: p.value, enabled: p.enabled })))) {
    queryParams.value = params;
  }
}, { immediate: true });

watch(bodyFormat, (newFormat) => {
  if ((newFormat === 'form-data' || newFormat === 'urlencoded') && formDataParams.value.length === 0) {
    formDataParams.value.push({
      id: crypto.randomUUID(),
      key: '',
      value: '',
      enabled: true,
      type: 'text'
    });
  }
});

onMounted(() => {
  headers.value = parseHeadersFromRequest(props.request.headers);
});

const sendRequest = async () => {
  if (!form.value.url) return;

  isLoading.value = true;
  response.value = null;
  activeTab.value = 'response';

  try {
    const requestBody = buildBody();
    let requestHeaders = buildHeadersRecord();

    if (bodyFormat.value === 'raw') {
      requestHeaders['Content-Type'] = rawContentType.value;
    } else if (bodyFormat.value === 'json') {
      requestHeaders['Content-Type'] = 'application/json';
    } else if (bodyFormat.value === 'form-data') {
      delete requestHeaders['Content-Type'];
    } else if (bodyFormat.value === 'urlencoded') {
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (bodyFormat.value === 'binary') {
      delete requestHeaders['Content-Type'];
    }

    const result = await $fetch<ProxyResponse | ProxyErrorResponse>('/api/proxy/request', {
      method: 'POST',
      body: {
        url: form.value.url,
        method: form.value.method,
        headers: requestHeaders,
        body: requestBody,
        workspaceId: props.workspaceId
      }
    });

    response.value = result;
  } catch (error: any) {
    response.value = {
      success: false,
      error: {
        message: error.message || 'Request failed',
        code: error.code || 'UNKNOWN_ERROR'
      },
      timing: {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMs: 0
      }
    };
  } finally {
    isLoading.value = false;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    sendRequest();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="p-4 border-b border-border-default bg-bg-secondary">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-sm font-semibold text-text-primary">{{ request.name }}</h2>
          <span 
            class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            :class="[methodColors[form.method] || 'text-text-primary']"
          >
            {{ form.method }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="p-4 border-b border-border-default bg-bg-secondary">
        <div class="flex gap-2 bg-bg-input border border-border-default rounded-lg p-1">
          <select 
            v-model="form.method" 
            :class="[
              'py-2.5 px-3 bg-transparent border-none border-r border-border-default font-semibold text-sm cursor-pointer min-w-[100px] focus:outline-none',
              methodColors[form.method] || 'text-text-primary'
            ]"
          >
            <option v-for="m in HTTP_METHODS" :key="m" :value="m">{{ m }}</option>
          </select>
          <input 
            v-model="form.url" 
            type="text" 
            class="flex-1 py-2.5 px-3 bg-transparent border-none text-text-primary font-mono text-sm focus:outline-none placeholder:text-text-muted" 
            placeholder="https://api.example.com/endpoint"
            @keyup.enter="sendRequest"
          />
          <button 
            class="py-2.5 px-8 bg-accent-blue text-white font-semibold rounded-md border-none cursor-pointer transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
            @click="sendRequest" 
            :disabled="isLoading || !form.url"
          >
            <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            {{ isLoading ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>

      <div class="border-b border-border-default bg-bg-secondary">
        <div class="flex gap-0">
          <button
            v-for="tab in ['params', 'headers', 'body', 'response'] as TabType[]"
            :key="tab"
            @click="activeTab = tab"
            class="px-4 py-3 text-xs font-medium capitalize transition-all duration-fast border-b-2 focus:outline-none whitespace-nowrap"
            :class="[
              activeTab === tab
                ? 'border-accent-blue text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            ]"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div v-if="activeTab === 'params'" class="flex-1 flex flex-col overflow-hidden">
          <div class="p-2 border-b border-border-default bg-bg-secondary flex items-center justify-between">
            <span class="text-xs text-text-muted">{{ queryParams.filter(p => p.enabled).length }} params</span>
            <button 
              @click="isBulkEditMode ? parseBulkQuery() : generateBulkQuery()"
              class="text-xs text-accent-blue hover:text-accent-blue/80"
            >
              {{ isBulkEditMode ? 'Done' : 'Bulk Edit' }}
            </button>
          </div>

          <div v-if="isBulkEditMode" class="flex-1 overflow-auto p-4">
            <textarea
              v-model="bulkQueryString"
              class="w-full h-full min-h-[200px] p-3 bg-bg-input border border-border-default rounded-lg text-text-primary font-mono text-sm resize-none focus:outline-none focus:border-accent-blue"
              placeholder="key1=value1&amp;key2=value2"
            />
          </div>

          <div v-else class="flex-1 overflow-auto">
            <div class="p-2">
              <div 
                v-for="(param, index) in queryParams" 
                :key="param.id"
                class="flex items-center gap-2 py-2 px-2 rounded hover:bg-bg-hover transition-colors duration-fast group"
              >
                <input 
                  type="checkbox" 
                  :checked="param.enabled"
                  @change="updateQueryParam(param.id, 'enabled', ($event.target as HTMLInputElement).checked)"
                  class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                />
                <input 
                  :value="param.key"
                  @input="updateQueryParam(param.id, 'key', ($event.target as HTMLInputElement).value)"
                  :disabled="!param.enabled"
                  type="text" 
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Key"
                />
                <input 
                  :value="param.value"
                  @input="updateQueryParam(param.id, 'value', ($event.target as HTMLInputElement).value)"
                  :disabled="!param.enabled"
                  type="text" 
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Value"
                />
                <button 
                  @click="removeQueryParam(param.id)"
                  class="p-1.5 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all duration-fast focus:opacity-100 focus:outline-none"
                  title="Remove param"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <button 
                @click="addQueryParam"
                class="w-full mt-2 py-2 text-xs text-accent-blue hover:text-accent-blue/80 border border-dashed border-border-default rounded hover:border-accent-blue transition-colors duration-fast flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Query Param
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'headers'" class="flex-1 flex flex-col overflow-hidden">
          <div class="p-2 border-b border-border-default bg-bg-secondary flex items-center justify-between">
            <span class="text-xs text-text-muted">{{ headers.filter(h => h.enabled).length }} headers</span>
            <button
              @click="addPresetHeaders"
              class="text-xs text-accent-blue hover:text-accent-blue/80"
            >
              Add Preset Headers
            </button>
          </div>

          <div class="flex-1 overflow-auto">
            <div class="p-2">
              <div
                v-for="(header, index) in headers"
                :key="header.id"
                class="flex items-center gap-2 py-2 px-2 rounded hover:bg-bg-hover transition-colors duration-fast group"
              >
                <input
                  type="checkbox"
                  :checked="header.enabled"
                  @change="updateHeader(header.id, 'enabled', ($event.target as HTMLInputElement).checked)"
                  class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                />
                <input
                  :value="header.key"
                  @input="updateHeader(header.id, 'key', ($event.target as HTMLInputElement).value)"
                  :disabled="!header.enabled"
                  type="text"
                  list="common-headers"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Header Name"
                />
                <input
                  :value="header.value"
                  @input="updateHeader(header.id, 'value', ($event.target as HTMLInputElement).value)"
                  :disabled="!header.enabled"
                  type="text"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Header Value"
                />
                <button
                  @click="removeHeader(header.id)"
                  class="p-1.5 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all duration-fast focus:opacity-100 focus:outline-none"
                  title="Remove header"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <button
                @click="addHeader"
                class="w-full mt-2 py-2 text-xs text-accent-blue hover:text-accent-blue/80 border border-dashed border-border-default rounded hover:border-accent-blue transition-colors duration-fast flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Header
              </button>
            </div>
          </div>

          <datalist id="common-headers">
            <option v-for="header in COMMON_HEADERS" :key="header" :value="header">{{ header }}</option>
          </datalist>
        </div>

        <div v-else-if="activeTab === 'body'" class="flex-1 flex flex-col overflow-hidden">
          <div class="p-2 border-b border-border-default bg-bg-secondary">
            <select 
              v-model="bodyFormat"
              class="py-1.5 px-3 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue cursor-pointer"
            >
              <option value="none">None</option>
              <option value="json">JSON</option>
              <option value="form-data">Form Data</option>
              <option value="urlencoded">x-www-form-urlencoded</option>
              <option value="raw">Raw</option>
              <option value="binary">Binary</option>
            </select>
          </div>

          <div class="flex-1 overflow-auto p-4">
            <div v-if="bodyFormat === 'none'" class="flex items-center justify-center text-text-muted text-sm py-10">
              This request does not have a body
            </div>

            <div v-else-if="bodyFormat === 'json'" class="space-y-3">
              <div class="relative">
                <textarea
                  v-model="jsonBody"
                  class="w-full h-[300px] p-3 bg-bg-input border border-border-default rounded-lg text-text-primary font-mono text-xs resize-none focus:outline-none focus:border-accent-blue"
                  placeholder="{
  &quot;key&quot;: &quot;value&quot;
}"
                />
                <div v-if="validateJson(jsonBody).valid" class="absolute top-2 right-2 px-2 py-0.5 bg-accent-green/15 text-accent-green text-[10px] font-semibold rounded">
                  Valid JSON
                </div>
                <div v-else-if="jsonBody.trim()" class="absolute top-2 right-2 px-2 py-0.5 bg-accent-red/15 text-accent-red text-[10px] font-semibold rounded">
                  Invalid JSON
                </div>
              </div>
              <div v-if="!validateJson(jsonBody).valid && jsonBody.trim()" class="text-xs text-accent-red">
                {{ validateJson(jsonBody).error }}
              </div>
            </div>

            <div v-else-if="bodyFormat === 'form-data'" class="space-y-2">
              <div
                v-for="(param, index) in formDataParams"
                :key="param.id"
                class="flex items-center gap-2 py-2 px-2 rounded hover:bg-bg-hover transition-colors duration-fast group"
              >
                <input
                  type="checkbox"
                  :checked="param.enabled"
                  @change="updateFormDataParam(param.id, 'enabled', ($event.target as HTMLInputElement).checked)"
                  class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                />
                <input
                  :value="param.key"
                  @input="updateFormDataParam(param.id, 'key', ($event.target as HTMLInputElement).value)"
                  :disabled="!param.enabled"
                  type="text"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Key"
                />
                <select
                  :value="param.type"
                  @change="updateFormDataParam(param.id, 'type', ($event.target as HTMLSelectElement).value as 'text' | 'file')"
                  :disabled="!param.enabled"
                  class="py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="text">Text</option>
                  <option value="file">File</option>
                </select>
                <div v-if="param.type === 'text'" class="flex-1">
                  <input
                    :value="param.value"
                    @input="updateFormDataParam(param.id, 'value', ($event.target as HTMLInputElement).value)"
                    :disabled="!param.enabled"
                    type="text"
                    class="w-full py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                    placeholder="Value"
                  />
                </div>
                <div v-else class="flex-1">
                  <input
                    type="file"
                    @change="handleFileSelect(param.id, $event)"
                    :disabled="!param.enabled"
                    class="w-full py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-muted text-xs focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  @click="removeFormDataParam(param.id)"
                  class="p-1.5 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all duration-fast focus:opacity-100 focus:outline-none"
                  title="Remove param"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <button
                @click="addFormDataParam"
                class="w-full py-2 text-xs text-accent-blue hover:text-accent-blue/80 border border-dashed border-border-default rounded hover:border-accent-blue transition-colors duration-fast flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Form Data Param
              </button>
            </div>

            <div v-else-if="bodyFormat === 'urlencoded'" class="space-y-2">
              <div
                v-for="(param, index) in formDataParams"
                :key="param.id"
                class="flex items-center gap-2 py-2 px-2 rounded hover:bg-bg-hover transition-colors duration-fast group"
              >
                <input
                  type="checkbox"
                  :checked="param.enabled"
                  @change="updateFormDataParam(param.id, 'enabled', ($event.target as HTMLInputElement).checked)"
                  class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                />
                <input
                  :value="param.key"
                  @input="updateFormDataParam(param.id, 'key', ($event.target as HTMLInputElement).value)"
                  :disabled="!param.enabled"
                  type="text"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Key"
                />
                <input
                  :value="param.value"
                  @input="updateFormDataParam(param.id, 'value', ($event.target as HTMLInputElement).value)"
                  :disabled="!param.enabled"
                  type="text"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted"
                  placeholder="Value"
                />
                <button
                  @click="removeFormDataParam(param.id)"
                  class="p-1.5 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all duration-fast focus:opacity-100 focus:outline-none"
                  title="Remove param"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <button
                @click="addFormDataParam"
                class="w-full py-2 text-xs text-accent-blue hover:text-accent-blue/80 border border-dashed border-border-default rounded hover:border-accent-blue transition-colors duration-fast flex items-center justify-center gap-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add URL Encoded Param
              </button>
            </div>

            <div v-else-if="bodyFormat === 'raw'" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="text-xs text-text-muted">Content-Type:</span>
                <select
                  v-model="rawContentType"
                  class="flex-1 py-1.5 px-3 bg-bg-input border border-border-default rounded text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue"
                >
                  <option v-for="ct in RAW_CONTENT_TYPES" :key="ct" :value="ct">{{ ct }}</option>
                </select>
              </div>
              <textarea
                v-model="rawBody"
                class="w-full h-[300px] p-3 bg-bg-input border border-border-default rounded-lg text-text-primary font-mono text-xs resize-none focus:outline-none focus:border-accent-blue"
                placeholder="Enter raw body content..."
              />
            </div>

            <div v-else-if="bodyFormat === 'binary'" class="space-y-3">
              <div class="p-8 border-2 border-dashed border-border-default rounded-lg text-center">
                <input
                  type="file"
                  @change="handleBinaryFileSelect($event)"
                  class="w-full"
                />
                <div v-if="binaryFile" class="mt-3 text-sm text-text-primary">
                  Selected: {{ binaryFile.name }} ({{ (binaryFile.size / 1024).toFixed(2) }} KB)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'response'" class="flex-1 flex flex-col overflow-hidden">
          <div v-if="!response" class="flex-1 flex items-center justify-center text-text-muted text-center p-10">
            <div class="flex flex-col items-center gap-3">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="opacity-30">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
              </svg>
              <p class="text-sm">Click "Send" or press <kbd class="px-2 py-0.5 bg-bg-tertiary rounded text-xs font-mono">Cmd+Enter</kbd> to send the request</p>
            </div>
          </div>

          <div v-else class="flex-1 overflow-auto p-4">
            <div class="space-y-4">
              <div v-if="response.success" class="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
                <div class="flex items-center justify-between py-2.5 px-4 border-b border-border-default">
                  <div class="flex items-center gap-3">
                    <span 
                      class="py-1 px-2.5 rounded text-[11px] font-semibold uppercase bg-accent-green/15 text-accent-green"
                    >
                      {{ response.status }} {{ response.statusText }}
                    </span>
                    <span class="text-xs text-text-muted font-mono">{{ response.timing.durationMs }}ms</span>
                  </div>
                </div>
                <div class="p-4 max-h-[400px] overflow-auto bg-bg-tertiary">
                  <pre class="font-mono text-xs leading-normal text-text-primary m-0 whitespace-pre-wrap break-words">{{ JSON.stringify(response.body, null, 2) }}</pre>
                </div>
              </div>

              <div v-else class="bg-bg-secondary border border-accent-red/30 rounded-lg overflow-hidden">
                <div class="flex items-center justify-between py-2.5 px-4 border-b border-accent-red/30">
                  <div class="flex items-center gap-3">
                    <span class="py-1 px-2.5 rounded text-[11px] font-semibold uppercase bg-accent-red/15 text-accent-red">
                      Error
                    </span>
                    <span v-if="response.error.code" class="text-xs text-text-muted font-mono">{{ response.error.code }}</span>
                  </div>
                </div>
                <div class="p-4">
                  <div class="mb-3">
                    <div class="text-sm font-medium text-accent-red mb-1">{{ response.error.message }}</div>
                    <div v-if="response.error.cause" class="text-xs text-text-muted">{{ response.error.cause }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
kbd {
  user-select: none;
}
</style>