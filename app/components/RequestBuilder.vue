<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import JsonNode from './JsonNode.vue';
import VariableInput from './VariableInput.vue';
import VariableTextarea from './VariableTextarea.vue';

interface Variable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

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
  environmentId?: string;
  collectionId?: string;
  projectId?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  saveRequest: [request: HttpRequest];
  saveAsRequest: [request: HttpRequest];
  unsavedChanges: [request: HttpRequest, hasUnsavedChanges: boolean];
}>();

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'response';
type BodyFormat = 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary';
type ResponseViewType = 'pretty' | 'preview' | 'raw' | 'headers' | 'cookies';

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
const environmentVariables = ref<Variable[]>([]);

// Fetch environment variables if environmentId is provided
watch(() => props.environmentId, async (newEnvId) => {
  if (newEnvId) {
    try {
      const variables = await $fetch<Variable[]>(`/api/admin/environments/${newEnvId}/variables`);
      environmentVariables.value = variables;
    } catch (error) {
      console.error('Failed to fetch environment variables:', error);
      environmentVariables.value = [];
    }
  } else {
    environmentVariables.value = [];
  }
}, { immediate: true });
const responseViewType = ref<ResponseViewType>('pretty');
const searchQuery = ref('');
const showSearch = ref(false);
const expandedNodes = ref<Set<string>>(new Set());

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

type AuthType = 'none' | 'basic' | 'bearer' | 'api-key';
const authType = ref<AuthType>('none');
const apiKey = ref({
  key: '',
  value: '',
  addTo: 'header' as 'header' | 'query'
});
const bearerToken = ref('');
const basicAuth = ref({
  username: '',
  password: ''
});
const inheritFromParent = ref(false);

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

const buildAuthHeaders = (): Record<string, string> => {
  const authHeaders: Record<string, string> = {};

  if (authType.value === 'api-key') {
    if (apiKey.value.addTo === 'header' && apiKey.value.key) {
      authHeaders[apiKey.value.key] = apiKey.value.value;
    }
  } else if (authType.value === 'bearer' && bearerToken.value) {
    authHeaders['Authorization'] = `Bearer ${bearerToken.value}`;
  } else if (authType.value === 'basic' && basicAuth.value.username) {
    const credentials = btoa(`${basicAuth.value.username}:${basicAuth.value.password}`);
    authHeaders['Authorization'] = `Basic ${credentials}`;
  }

  return authHeaders;
};

const buildAuthQueryParams = (): Record<string, string> => {
  const queryParams: Record<string, string> = {};

  if (authType.value === 'api-key' && apiKey.value.addTo === 'query' && apiKey.value.key) {
    queryParams[apiKey.value.key] = apiKey.value.value;
  }

  return queryParams;
};

const parseAuthFromRequest = (authConfig: any) => {
  if (!authConfig) {
    authType.value = 'none';
    return;
  }

  const type = authConfig.type as AuthType;
  authType.value = type;

  if (type === 'api-key' && authConfig.credentials) {
    apiKey.value.key = authConfig.credentials.key || '';
    apiKey.value.value = authConfig.credentials.value || '';
    apiKey.value.addTo = (authConfig.credentials.addTo as 'header' | 'query') || 'header';
  } else if (type === 'bearer' && authConfig.credentials) {
    bearerToken.value = authConfig.credentials.token || '';
  } else if (type === 'basic' && authConfig.credentials) {
    basicAuth.value.username = authConfig.credentials.username || '';
    basicAuth.value.password = authConfig.credentials.password || '';
  }
};

const getResponseStatusColorClass = (status: number) => {
  if (status >= 200 && status < 300) return 'bg-accent-green/15 text-accent-green';
  if (status >= 400 && status < 500) return 'bg-accent-orange/15 text-accent-orange';
  if (status >= 500) return 'bg-accent-red/15 text-accent-red';
  return 'bg-bg-tertiary text-text-muted';
};

const getTotalResponseSize = () => {
  if (!response.value || !('success' in response.value)) return 0;

  const bodyText = getResponseText();
  let headersSize = 0;

  if (response.value.headers) {
    Object.entries(response.value.headers).forEach(([key, value]) => {
      headersSize += key.length + value.length + 4;
    });
  }

  return bodyText.length + headersSize;
};

const parseResponseCookies = () => {
  if (!response.value || !('success' in response.value) || !response.value.headers) {
    return [];
  }

  const setCookieHeader = response.value.headers['set-cookie'];
  if (!setCookieHeader) return [];

  const cookies: Array<{ name: string; value: string; attributes: string }> = [];
  const cookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  cookieHeaders.forEach(cookieHeader => {
    const [pair, ...attributeParts] = cookieHeader.split(';');
    const [name, value] = pair.split('=').map(s => s.trim());
    cookies.push({
      name,
      value: value || '',
      attributes: attributeParts.join(';').trim()
    });
  });

  return cookies;
};

const responseCookies = computed(() => parseResponseCookies());

const hasUnsavedChanges = computed(() => {
  const currentUrl = form.value.url;
  const originalUrl = props.request.url;
  const currentMethod = form.value.method;
  const originalMethod = props.request.method;
  const currentHeaders = buildHeadersRecord();
  const originalHeaders = props.request.headers;
  const currentBody = buildBody();
  const originalBody = props.request.body;
  const currentAuth = {
    type: authType.value,
    credentials: authType.value === 'api-key' ? { 
      key: apiKey.value.key, 
      value: apiKey.value.value,
      addTo: apiKey.value.addTo
    } : authType.value === 'bearer' ? { token: bearerToken.value } 
      : authType.value === 'basic' ? {
        username: basicAuth.value.username,
        password: basicAuth.value.password
      } : undefined
  } || null;
  const originalAuth = props.request.auth;

  const urlChanged = currentUrl !== originalUrl;
  const methodChanged = currentMethod !== originalMethod;
  const headersChanged = JSON.stringify(currentHeaders) !== JSON.stringify(originalHeaders || {});
  const bodyChanged = JSON.stringify(currentBody) !== JSON.stringify(originalBody);
  const authChanged = JSON.stringify(currentAuth) !== JSON.stringify(originalAuth || {});

  return urlChanged || methodChanged || headersChanged || bodyChanged || authChanged;
});

const getContentType = () => {
  if (response.value && 'success' in response.value && response.value.headers) {
    return response.value.headers['content-type'] || '';
  }
  return '';
};

const isJsonResponse = () => {
  const contentType = getContentType();
  return contentType.includes('json') || (response.value && 'success' in response.value && typeof response.value.body === 'object');
};

const isXmlResponse = () => {
  const contentType = getContentType();
  return contentType.includes('xml') || contentType.includes('text/xml');
};

const isHtmlResponse = () => {
  const contentType = getContentType();
  return contentType.includes('html');
};

const getResponseText = () => {
  if (!response.value || !('success' in response.value)) return '';
  
  const body = response.value.body;
  if (typeof body === 'string') return body;
  if (typeof body === 'object') return JSON.stringify(body, null, 2);
  return String(body);
};

const copyResponseBody = async () => {
  const text = getResponseText();
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
};

const highlightJson = (data: any, path = 'root', level = 0): any => {
  if (data === null) {
    return { type: 'null', value: 'null', path, level };
  }
  
  if (typeof data === 'boolean') {
    return { type: 'boolean', value: String(data), path, level };
  }
  
  if (typeof data === 'number') {
    return { type: 'number', value: String(data), path, level };
  }
  
  if (typeof data === 'string') {
    return { type: 'string', value: data, path, level };
  }
  
  if (Array.isArray(data)) {
    return {
      type: 'array',
      length: data.length,
      children: data.map((item, index) => highlightJson(item, `${path}[${index}]`, level + 1)),
      path,
      level,
      expanded: expandedNodes.value.has(path)
    };
  }
  
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    return {
      type: 'object',
      entries: entries.map(([key, value]) => ({
        key,
        value: highlightJson(value, `${path}.${key}`, level + 1)
      })),
      path,
      level,
      expanded: expandedNodes.value.has(path)
    };
  }
  
  return { type: 'unknown', value: String(data), path, level };
};

const toggleNode = (path: string) => {
  if (expandedNodes.value.has(path)) {
    expandedNodes.value.delete(path);
  } else {
    expandedNodes.value.add(path);
  }
};

const expandAll = () => {
  const expandRecursive = (node: any) => {
    if (node.path) {
      expandedNodes.value.add(node.path);
    }
    if (node.children) {
      node.children.forEach(expandRecursive);
    }
    if (node.entries) {
      node.entries.forEach((entry: any) => expandRecursive(entry.value));
    }
  };

  if (response.value && 'success' in response.value && typeof response.value.body === 'object') {
    const highlighted = highlightJson(response.value.body);
    expandRecursive(highlighted);
  }
};

const collapseAll = () => {
  expandedNodes.value.clear();
};

const highlightXml = (xml: string) => {
  const lines = xml.split('\n');
  return lines.map((line, index) => {
    let highlighted = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    highlighted = highlighted.replace(/(&lt;\/?[a-zA-Z][a-zA-Z0-9:]*)/g, '<span class="text-accent-purple">$1</span>');
    highlighted = highlighted.replace(/(\/?&gt;)/g, '<span class="text-accent-purple">$1</span>');
    highlighted = highlighted.replace(/(="[^"]*")/g, '<span class="text-accent-orange">$1</span>');
    
    return { index: index + 1, content: highlighted, original: line };
  });
};

const getHighlightedJson = computed(() => {
  if (!response.value || !('success' in response.value)) return null;
  
  const body = response.value.body;
  if (typeof body !== 'object') return null;
  
  return highlightJson(body);
});

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const getFilteredJson = computed(() => {
  if (!searchQuery.value) return getHighlightedJson.value;
  
  const filterData = (data: any, query: string): any => {
    const queryLower = query.toLowerCase();
    
    if (!query) return data;
    
    const hasMatch = (obj: any): boolean => {
      if (obj.type === 'string' && obj.value.toLowerCase().includes(queryLower)) {
        return true;
      }
      if (obj.type === 'number' || obj.type === 'boolean' || obj.type === 'null') {
        if (String(obj.value).toLowerCase().includes(queryLower)) {
          return true;
        }
      }
      if (obj.children) {
        return obj.children.some(hasMatch);
      }
      if (obj.entries) {
        return obj.entries.some((entry: any) => 
          entry.key.toLowerCase().includes(queryLower) || hasMatch(entry.value)
        );
      }
      return false;
    };
    
    if (!hasMatch(data)) return null;
    
    if (data.type === 'array') {
      return {
        ...data,
        children: data.children.map((child: any) => filterData(child, query)).filter(Boolean)
      };
    }
    
    if (data.type === 'object') {
      return {
        ...data,
        entries: data.entries
          .map((entry: any) => ({
            key: entry.key,
            value: filterData(entry.value, query)
          }))
          .filter((entry: any) => entry.value !== null || entry.key.toLowerCase().includes(queryLower))
      };
    }
    
    return data;
  };
  
  if (!getHighlightedJson.value) return null;
  return filterData(getHighlightedJson.value, searchQuery.value);
});

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    sendRequest();
  } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    openSaveDialog();
  } else if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'S')) {
    e.preventDefault();
    openSaveAsDialog();
  } else if ((e.metaKey || e.ctrlKey) && e.key === 'f' && activeTab.value === 'response') {
    e.preventDefault();
    showSearch.value = !showSearch.value;
    if (showSearch.value) {
      nextTick(() => {
        const searchInput = document.querySelector('#response-search-input') as HTMLInputElement;
        searchInput?.focus();
      });
    }
  }
};

const openSaveDialog = () => {
  emit('saveRequest', {
    id: props.request.id,
    folderId: props.request.folderId,
    name: props.request.name,
    method: form.value.method,
    url: form.value.url,
    headers: buildHeadersRecord(),
    body: buildBody(),
    auth: {
      type: authType.value,
      credentials: authType.value === 'api-key' ? { 
        key: apiKey.value.key, 
        value: apiKey.value.value,
        addTo: apiKey.value.addTo
      } : authType.value === 'bearer' ? { token: bearerToken.value } 
        : authType.value === 'basic' ? {
          username: basicAuth.value.username,
          password: basicAuth.value.password
        } : undefined
    } || null,
    order: props.request.order,
    createdAt: props.request.createdAt,
    updatedAt: new Date()
  });
};

const openSaveAsDialog = () => {
  emit('saveAsRequest', {
    id: props.request.id,
    folderId: props.request.folderId,
    name: props.request.name,
    method: form.value.method,
    url: form.value.url,
    headers: buildHeadersRecord(),
    body: buildBody(),
    auth: {
      type: authType.value,
      credentials: authType.value === 'api-key' ? { 
        key: apiKey.value.key, 
        value: apiKey.value.value,
        addTo: apiKey.value.addTo
      } : authType.value === 'bearer' ? { token: bearerToken.value } 
        : authType.value === 'basic' ? {
          username: basicAuth.value.username,
          password: basicAuth.value.password
        } : undefined
    } || null,
    order: props.request.order,
    createdAt: props.request.createdAt,
    updatedAt: new Date()
  });
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

watch(hasUnsavedChanges, (newValue) => {
  emit('unsavedChanges', props.request, newValue);
});

onMounted(() => {
  headers.value = parseHeadersFromRequest(props.request.headers);
  parseAuthFromRequest(props.request.auth);
});

const sendRequest = async () => {
  if (!form.value.url) return;

  isLoading.value = true;
  response.value = null;
  activeTab.value = 'response';
  searchQuery.value = '';
  showSearch.value = false;
  expandedNodes.value.clear();

  try {
    const requestBody = buildBody();
    let requestHeaders = buildHeadersRecord();
    const authHeaders = buildAuthHeaders();

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

    requestHeaders = { ...requestHeaders, ...authHeaders };

    let requestUrl = form.value.url;
    const authQueryParams = buildAuthQueryParams();
    if (Object.keys(authQueryParams).length > 0) {
      try {
        const urlObj = new URL(requestUrl);
        Object.entries(authQueryParams).forEach(([key, value]) => {
          urlObj.searchParams.set(key, value);
        });
        requestUrl = urlObj.toString();
      } catch {
      }
    }

    const result = await $fetch<ProxyResponse | ProxyErrorResponse>('/api/proxy/request', {
      method: 'POST',
      body: {
        url: requestUrl,
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
          <h2 class="text-sm font-semibold text-text-primary flex items-center gap-2">
            {{ request.name }}
            <span 
              v-if="hasUnsavedChanges"
              class="w-2 h-2 rounded-full bg-accent-orange"
              title="Unsaved changes"
            ></span>
          </h2>
          <span 
            class="text-[10px] font-semibold px-1.5 py-0.5 rounded"
            :class="[methodColors[form.method] || 'text-text-primary']"
          >
            {{ form.method }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="openSaveAsDialog"
            class="py-1.5 px-3 bg-bg-input text-text-secondary rounded border border-border-default cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary text-xs font-medium"
            title="Save as new request (Cmd+Shift+S)"
          >
            Save As
          </button>
          <button 
            @click="openSaveDialog"
            class="py-1.5 px-3 bg-accent-blue text-white rounded border-none cursor-pointer transition-all duration-fast hover:bg-[#1976D2] text-xs font-medium"
            title="Save request (Cmd+S)"
          >
            Save
          </button>
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
          <VariableInput
            v-model="form.url"
            :variables="environmentVariables"
            placeholder="https://api.example.com/endpoint"
            class="flex-1 py-2.5 px-3 bg-transparent border-none text-text-primary font-mono text-sm focus:outline-none placeholder:text-text-muted"
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
            v-for="tab in ['params', 'headers', 'body', 'auth', 'response'] as TabType[]"
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
                <VariableInput
                  :model-value="param.key"
                  @update:model-value="updateQueryParam(param.id, 'key', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Key"
                  class="flex-1"
                />
                <VariableInput
                  :model-value="param.value"
                  @update:model-value="updateQueryParam(param.id, 'value', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Value"
                  class="flex-1"
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
                <VariableInput
                  :model-value="header.key"
                  @update:model-value="updateHeader(header.id, 'key', $event)"
                  :disabled="!header.enabled"
                  :variables="environmentVariables"
                  placeholder="Header Name"
                  class="flex-1"
                />
                <VariableInput
                  :model-value="header.value"
                  @update:model-value="updateHeader(header.id, 'value', $event)"
                  :disabled="!header.enabled"
                  :variables="environmentVariables"
                  placeholder="Header Value"
                  class="flex-1"
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
                <VariableTextarea
                  v-model="jsonBody"
                  :variables="environmentVariables"
                  :rows="12"
                  placeholder="{
  &quot;key&quot;: &quot;value&quot;
}"
                  class="w-full"
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
                <VariableInput
                  :model-value="param.key"
                  @update:model-value="updateFormDataParam(param.id, 'key', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Key"
                  class="flex-1"
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
                  <VariableInput
                    :model-value="param.value"
                    @update:model-value="updateFormDataParam(param.id, 'value', $event)"
                    :disabled="!param.enabled"
                    :variables="environmentVariables"
                    placeholder="Value"
                    class="w-full"
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
                <VariableInput
                  :model-value="param.key"
                  @update:model-value="updateFormDataParam(param.id, 'key', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Key"
                  class="flex-1"
                />
                <VariableInput
                  :model-value="param.value"
                  @update:model-value="updateFormDataParam(param.id, 'value', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Value"
                  class="flex-1"
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
              <VariableTextarea
                v-model="rawBody"
                :variables="environmentVariables"
                :rows="12"
                placeholder="Enter raw body content..."
                class="w-full"
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

        <div v-else-if="activeTab === 'auth'" class="flex-1 flex flex-col overflow-hidden">
          <div class="flex-1 overflow-auto p-4">
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="text-xs font-medium text-text-secondary">Auth Type</label>
                <select
                  v-model="authType"
                  class="w-full py-2 px-3 bg-bg-input border border-border-default rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                >
                  <option value="none">No Auth</option>
                  <option value="basic">Basic Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api-key">API Key</option>
                </select>
              </div>

              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="inheritFromParent"
                  class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                />
                <span class="text-xs text-text-secondary">Inherit from parent</span>
              </label>

              <div v-if="authType === 'api-key'" class="space-y-3 p-3 bg-bg-tertiary rounded border border-border-default">
                <div class="space-y-2">
                  <label class="text-xs font-medium text-text-secondary">Key</label>
                  <VariableInput
                    v-model="apiKey.key"
                    :variables="environmentVariables"
                    placeholder="Enter key name (e.g., X-API-Key)"
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-medium text-text-secondary">Value</label>
                  <VariableInput
                    v-model="apiKey.value"
                    :variables="environmentVariables"
                    type="password"
                    placeholder="Enter API key value"
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-medium text-text-secondary">Add to</label>
                  <div class="flex gap-2">
                    <button
                      @click="apiKey.addTo = 'header'"
                      class="flex-1 py-2 px-3 rounded text-xs font-medium transition-all duration-fast"
                      :class="apiKey.addTo === 'header' ? 'bg-accent-blue text-white' : 'bg-bg-input text-text-secondary hover:border-accent-blue border border-border-default'"
                    >
                      Header
                    </button>
                    <button
                      @click="apiKey.addTo = 'query'"
                      class="flex-1 py-2 px-3 rounded text-xs font-medium transition-all duration-fast"
                      :class="apiKey.addTo === 'query' ? 'bg-accent-blue text-white' : 'bg-bg-input text-text-secondary hover:border-accent-blue border border-border-default'"
                    >
                      Query Params
                    </button>
                  </div>
                </div>
                <div class="text-xs text-text-muted">
                  <span v-if="apiKey.addTo === 'header'">
                    This will be sent as a header: <span class="font-mono text-text-secondary">{{ apiKey.key || 'X-API-Key' }}: {{ apiKey.value ? '***' : '' }}</span>
                  </span>
                  <span v-else>
                    This will be sent as a query parameter: <span class="font-mono text-text-secondary">{{ apiKey.key || 'api_key' }}={{ apiKey.value ? '***' : '' }}</span>
                  </span>
                </div>
              </div>

              <div v-if="authType === 'bearer'" class="space-y-3 p-3 bg-bg-tertiary rounded border border-border-default">
                <div class="space-y-2">
                  <label class="text-xs font-medium text-text-secondary">Token</label>
                  <VariableInput
                    v-model="bearerToken"
                    :variables="environmentVariables"
                    type="password"
                    placeholder="Enter bearer token"
                    class="w-full"
                  />
                </div>
                <div class="text-xs text-text-muted">
                  This will be sent as an Authorization header in the format: <span class="font-mono text-text-secondary">Bearer &lt;token&gt;</span>
                </div>
              </div>

              <div v-if="authType === 'basic'" class="space-y-3 p-3 bg-bg-tertiary rounded border border-border-default">
                <div class="space-y-2">
                  <label class="text-xs font-medium text-text-secondary">Username</label>
                  <VariableInput
                    v-model="basicAuth.username"
                    :variables="environmentVariables"
                    placeholder="Enter username"
                    class="w-full"
                  />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-medium text-text-secondary">Password</label>
                  <VariableInput
                    v-model="basicAuth.password"
                    :variables="environmentVariables"
                    type="password"
                    placeholder="Enter password"
                    class="w-full"
                  />
                </div>
                <div class="text-xs text-text-muted">
                  This will be sent as an Authorization header in the format: <span class="font-mono text-text-secondary">Basic &lt;base64(username:password)&gt;</span>
                </div>
              </div>

              <div v-if="authType === 'none'" class="p-4 text-center text-text-muted text-sm">
                This request will be sent without authentication
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

          <div v-else class="flex-1 flex flex-col overflow-hidden">
            <div v-if="response.success" class="border-b border-border-default bg-bg-secondary">
              <div class="flex items-center justify-between py-2.5 px-4 border-b border-border-default">
                <div class="flex items-center gap-3">
                  <span
                    class="py-1 px-2.5 rounded text-[11px] font-semibold uppercase"
                    :class="getResponseStatusColorClass(response.status)"
                  >
                    {{ response.status }} {{ response.statusText }}
                  </span>
                  <span class="text-xs text-text-muted font-mono">{{ response.timing.durationMs }}ms</span>
                  <span class="text-xs text-text-muted">{{ getTotalResponseSize() }} bytes</span>
                </div>
                <div class="flex items-center gap-2">
                  <button 
                    @click="showSearch = !showSearch"
                    class="p-1.5 text-text-muted hover:text-text-secondary transition-colors duration-fast"
                    title="Search (Cmd/Ctrl+F)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                  <button 
                    @click="copyResponseBody"
                    class="p-1.5 text-text-muted hover:text-text-secondary transition-colors duration-fast"
                    title="Copy response body"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div v-if="showSearch || searchQuery" class="px-4 py-2 border-b border-border-default">
                <div class="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    id="response-search-input"
                    v-model="searchQuery"
                    type="text"
                    class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs focus:outline-none focus:border-accent-blue placeholder:text-text-muted"
                    placeholder="Search in response..."
                  />
                  <button
                    v-if="searchQuery"
                    @click="searchQuery = ''"
                    class="p-1 text-text-muted hover:text-text-secondary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <button
                    @click="showSearch = false"
                    class="p-1 text-text-muted hover:text-text-secondary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-1 border-b border-border-default overflow-x-auto">
                <button
                  @click="responseViewType = 'pretty'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'pretty' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Pretty
                </button>
                <button
                  v-if="isJsonResponse()"
                  @click="responseViewType = 'preview'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'preview' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Preview
                </button>
                <button
                  @click="responseViewType = 'raw'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'raw' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Raw
                </button>
                <button
                  @click="responseViewType = 'headers'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'headers' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Headers
                </button>
                <button
                  v-if="responseCookies.length > 0"
                  @click="responseViewType = 'cookies'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'cookies' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Cookies
                </button>
              </div>
            </div>

            <div v-if="response.success" class="flex-1 overflow-auto p-4">
              <div v-if="responseViewType === 'pretty' && isJsonResponse() && getFilteredJson" class="space-y-1">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">JSON</span>
                  <button
                    @click="expandAll"
                    class="text-xs text-accent-blue hover:text-accent-blue/80"
                  >
                    Expand All
                  </button>
                  <span class="text-text-muted">|</span>
                  <button
                    @click="collapseAll"
                    class="text-xs text-accent-blue hover:text-accent-blue/80"
                  >
                    Collapse All
                  </button>
                </div>
                <JsonNode
                  :node="getFilteredJson"
                  :search-query="searchQuery"
                  @toggle="toggleNode"
                />
              </div>

              <div v-else-if="responseViewType === 'pretty' && isXmlResponse()" class="space-y-1">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">XML</span>
                </div>
                <div class="font-mono text-xs leading-normal bg-bg-tertiary rounded p-3 border border-border-default">
                  <div
                    v-for="(line, index) in highlightXml(getResponseText())"
                    :key="index"
                    class="hover:bg-bg-hover px-1 -mx-1 transition-colors duration-fast"
                    :class="{ 'bg-accent-yellow/20': searchQuery && line.original.toLowerCase().includes(searchQuery.toLowerCase()) }"
                  >
                    <span class="text-text-muted select-none w-8 inline-block">{{ String(line.index).padStart(3, '0') }}</span>
                    <span v-html="line.content"></span>
                  </div>
                </div>
              </div>

              <div v-else-if="responseViewType === 'preview' && isJsonResponse()" class="h-full">
                <iframe
                  :srcdoc="`<!DOCTYPE html><html><head><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; margin: 0; }</style></head><body><pre>${escapeHtml(getResponseText())}</pre></body></html>`"
                  class="w-full h-full border-none rounded bg-bg-tertiary"
                ></iframe>
              </div>

              <div v-else-if="responseViewType === 'raw'" class="space-y-1">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">{{ getContentType().split(';')[0] }}</span>
                </div>
                <pre class="font-mono text-xs leading-normal bg-bg-tertiary rounded p-3 border border-border-default overflow-auto whitespace-pre-wrap break-words text-text-primary m-0">{{ getResponseText() }}</pre>
              </div>

              <div v-else-if="responseViewType === 'headers'" class="space-y-1">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">{{ Object.keys(response.headers).length }} headers</span>
                </div>
                <div class="bg-bg-tertiary rounded border border-border-default overflow-hidden">
                  <div
                    v-for="[key, value] in Object.entries(response.headers)"
                    :key="key"
                    class="flex items-start py-2 px-3 border-b border-border-default last:border-b-0 hover:bg-bg-hover transition-colors duration-fast"
                  >
                    <span class="font-mono text-xs text-accent-blue flex-shrink-0 w-1/3">{{ key }}</span>
                    <span class="font-mono text-xs text-text-primary flex-1 break-all">{{ value }}</span>
                  </div>
                </div>
              </div>

<div v-else-if="responseViewType === 'cookies'" class="space-y-1">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">{{ responseCookies.length }} cookies</span>
                </div>
                <div class="bg-bg-tertiary rounded border border-border-default overflow-hidden">
                  <div
                    v-for="(cookie, index) in responseCookies"
                    :key="index"
                    class="py-2 px-3 border-b border-border-default last:border-b-0 hover:bg-bg-hover transition-colors duration-fast"
                  >
                    <div class="flex items-start gap-2 mb-1">
                      <span class="font-mono text-xs text-accent-blue flex-shrink-0">{{ cookie.name }}</span>
                      <span class="text-text-secondary">=</span>
                      <span class="font-mono text-xs text-text-primary flex-1 break-all">{{ cookie.value }}</span>
                    </div>
                    <div v-if="cookie.attributes" class="text-xs text-text-muted font-mono ml-2">
                      {{ cookie.attributes }}
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="space-y-1">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">{{ getContentType().split(';')[0] }}</span>
                </div>
                <pre class="font-mono text-xs leading-normal bg-bg-tertiary rounded p-3 border border-border-default overflow-auto whitespace-pre-wrap break-words text-text-primary m-0">{{ getResponseText() }}</pre>
              </div>
            </div>

            <div v-else class="flex-1 overflow-auto p-4">
              <div class="bg-bg-secondary border border-accent-red/30 rounded-lg overflow-hidden">
                <div class="flex items-center py-2.5 px-4 border-b border-accent-red/30">
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