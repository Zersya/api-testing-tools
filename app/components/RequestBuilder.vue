<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import { debounce } from 'perfect-debounce';
import JsonNode from './JsonNode.vue';
import VariableInput from './VariableInput.vue';
import VariableTextarea from './VariableTextarea.vue';
import RequestExampleManager from './RequestExampleManager.vue';
import MockConfiguration from './MockConfiguration.vue';
import { useUsageTracking } from '~/composables/useUsageTracking';

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

interface PersistedBodyParam {
  key: string;
  value: string;
  enabled: boolean;
  type: 'text' | 'file';
}

interface PathVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description: string;
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
  mockConfig?: import('../../server/db/schema/savedRequest').MockConfig | null;
  pathVariables?: import('../../server/db/schema/savedRequest').RequestPathVariables | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProxyResponse {
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

export interface ProxyErrorResponse {
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

export type TabType = 'params' | 'headers' | 'body' | 'auth' | 'preScript' | 'postScript' | 'mock' | 'examples' | 'response';
type BodyFormat = 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary';
type ResponseViewType = 'pretty' | 'preview' | 'raw' | 'headers' | 'cookies' | 'imagePreview' | 'console';

export interface RequestDraftSnapshot {
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | string | null;
  auth: {
    type: string;
    credentials?: Record<string, string>;
  } | null;
  mockConfig?: import('../../server/db/schema/savedRequest').MockConfig | null;
  preScript?: string;
  postScript?: string;
  pathVariables?: import('../../server/db/schema/savedRequest').RequestPathVariables | null;
  bodyFormat?: BodyFormat;
  jsonBody?: string;
  rawBody?: string;
  rawContentType?: string;
  formDataParams?: PersistedBodyParam[];
}

interface Props {
  request: HttpRequest;
  workspaceId?: string;
  environmentId?: string;
  collectionId?: string;
  projectId?: string;
  readOnly?: boolean;
  // Tab key for identifying unique tab instance (handles multiple tabs with same request.id)
  tabKey?: string;
  // Initial state props for persistence
  initialResponse?: ProxyResponse | ProxyErrorResponse | null;
  initialActiveTab?: TabType;
  initialScriptLogs?: Array<{ phase: 'pre' | 'post'; type: 'log' | 'error' | 'warn'; message: string; timestamp: number }>;
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
});

const emit = defineEmits<{
  saveRequest: [request: HttpRequest];
  saveAsRequest: [request: HttpRequest];
  unsavedChanges: [request: HttpRequest, hasUnsavedChanges: boolean, draft: RequestDraftSnapshot];
  // State persistence events
  stateChange: [state: { response: any; activeTab: TabType; scriptLogs: any[] }];
}>();

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

const responseViewType = ref<ResponseViewType>('pretty');

const queryParams = ref<QueryParam[]>([]);
const isBulkEditMode = ref(false);
const bulkQueryString = ref('');

const pathVariables = ref<PathVariable[]>([]);

const headers = ref<HeaderParam[]>([]);

const bodyFormat = ref<BodyFormat>('none');
const jsonBody = ref('');
const formDataParams = ref<BodyParam[]>([]);
const rawBody = ref('');
const rawContentType = ref('text/plain');
const binaryFile = ref<File | null>(null);

type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';
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
const oauth2 = ref({
  authUrl: '',
  tokenUrl: '',
  clientId: '',
  clientSecret: '',
  scopes: '',
  callbackUrl: '',
  accessToken: '',
  refreshToken: '',
  expiresAt: null as number | null,
  tokenType: 'Bearer',
  grantType: 'authorization_code' as 'authorization_code' | 'client_credentials',
  PKCE: false
});
const isGettingToken = ref(false);
const tokenError = ref('');
const inheritFromParent = ref(false);
const expandedNodes = ref(new Set<string>());
const showSearch = ref(false);
const searchQuery = ref('');
const responseContentRef = ref<HTMLElement | null>(null);
const searchMatches = ref<HTMLElement[]>([]);
const activeSearchMatchIndex = ref(-1);

// Save response as example state
const showSaveExampleModal = ref(false);
const saveExampleName = ref('');
const saveExampleIsDefault = ref(false);
const saveExampleLoading = ref(false);
const saveExampleError = ref<string | null>(null);
const saveExampleSuccess = ref(false);

// Mock configuration state
const mockConfig = ref<import('../../server/db/schema/savedRequest').MockConfig | null>(null);

// Script state
const preScript = ref('');
const postScript = ref('');
const scriptLogs = ref<Array<{ phase: 'pre' | 'post'; type: 'log' | 'error' | 'warn'; message: string; timestamp: number }>>([]);
const activeScriptTab = ref<'console' | 'preScript' | 'postScript'>('console');

const { trackRequestExecution } = useUsageTracking();

const parseUrlQuery = (url: string) => {
  try {
    // Handle URLs with environment variables like {{URL}}
    // Extract the query string part after '?'
    const queryStringMatch = url.match(/\?(.+)$/);
    if (!queryStringMatch) return [];
    
    const queryString = queryStringMatch[1];
    const params: QueryParam[] = [];
    
    // Parse query string manually to handle encoded values
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=');
      if (key) {
        const value = valueParts.join('='); // Handle values that contain '='
        params.push({
          id: crypto.randomUUID(),
          key: decodeURIComponent(key),
          value: decodeURIComponent(value || ''),
          enabled: true
        });
      }
    }
    
    return params;
  } catch {
    return [];
  }
};

// Track the last loaded request ID to prevent duplicate loads
const lastLoadedRequestId = ref<string | null>(null);

// Track the serialized version of the last loaded request to detect changes
const lastLoadedRequestSnapshot = ref<string>('');

// Track the last saved state to detect unsaved changes after save
const lastSavedState = ref<{
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: any;
  auth: any;
  mockConfig: import('../../server/db/schema/savedRequest').MockConfig | null;
} | null>(null);

// Function to capture current state as saved
const captureCurrentStateAsSaved = () => {
  lastSavedState.value = {
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
    },
    mockConfig: mockConfig.value,
    preScript: preScript.value,
    postScript: postScript.value,
    pathVariables: buildPathVariablesRecord()
  };
};

// Path Variables functions
const extractPathVariablesFromUrl = (url: string): string[] => {
  // Match only :paramName syntax (not {{environmentVariables}})
  // Exclude pure numbers (like port numbers :8080) by requiring at least one letter
  const pathVariablePattern = /:([a-zA-Z_]\w*)/g;
  const matches: string[] = [];
  let match;
  while ((match = pathVariablePattern.exec(url)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)]; // Remove duplicates
};

const addPathVariable = (key: string) => {
  const existingVar = pathVariables.value.find(v => v.key === key);
  if (!existingVar) {
    pathVariables.value.push({
      id: crypto.randomUUID(),
      key,
      value: '',
      enabled: true,
      description: ''
    });
  }
};

const removePathVariable = (id: string) => {
  const index = pathVariables.value.findIndex(v => v.id === id);
  if (index !== -1) {
    pathVariables.value.splice(index, 1);
  }
};

const updatePathVariable = (id: string, field: keyof PathVariable, value: string | boolean) => {
  const variable = pathVariables.value.find(v => v.id === id);
  if (variable) {
    variable[field] = value as never;
  }
};

const resolvePathVariables = (url: string): string => {
  let resolvedUrl = url;
  pathVariables.value.forEach(variable => {
    if (variable.enabled && variable.key) {
      // Skip pure numeric keys (like "8080" which is a port, not a path variable)
      if (/^\d+$/.test(variable.key)) {
        return;
      }
      // Replace only :key syntax (not {{environmentVariables}})
      // Use same pattern as extract: require at least one letter to avoid matching ports
      const pattern = new RegExp(`:${variable.key}(?![a-zA-Z0-9_])`, 'g');
      resolvedUrl = resolvedUrl.replace(pattern, variable.value);
    }
  });
  return resolvedUrl;
};

// Track whether this is the first load (for state restoration)
const isFirstLoad = ref(true);

// Function to load request data into form state
const loadRequestData = (request: HttpRequest) => {
  // Create a snapshot of key fields to detect changes
  const snapshot = JSON.stringify({
    id: request.id,
    url: request.url,
    headers: request.headers,
    body: request.body,
    auth: request.auth
  });
  
  // Skip if exactly the same as what we loaded
  if (snapshot === lastLoadedRequestSnapshot.value && lastLoadedRequestId.value === request.id && !isFirstLoad.value) {
    return;
  }
  
  // Reset all form state first to prevent stale data
  form.value.method = request.method as typeof HTTP_METHODS[number];
  form.value.url = request.url;
  
  // Reset query params
  queryParams.value = parseUrlQuery(request.url);
  
  // Reset headers
  if (request.headers) {
    try {
      let headersObj: Record<string, string>;
      
      if (typeof request.headers === 'string') {
        headersObj = JSON.parse(request.headers);
      } else {
        headersObj = request.headers as Record<string, string>;
      }
      
      // Validate that headersObj is actually an object, not an array or other type
      if (headersObj && typeof headersObj === 'object' && !Array.isArray(headersObj)) {
        headers.value = Object.entries(headersObj).map(([key, value]) => {
          let strValue = String(value);
          // Strip surrounding quotes if present (handles double-quoted strings from import)
          if (strValue.startsWith('"') && strValue.endsWith('"') && strValue.length >= 2) {
            try {
              strValue = JSON.parse(strValue);
            } catch {
              // If parsing fails, keep original value
            }
          }
          return {
            id: crypto.randomUUID(),
            key,
            value: strValue,
            enabled: true
          };
        });
      } else {
        console.warn('Invalid headers format:', headersObj);
        headers.value = [];
      }
    } catch (e) {
      console.warn('Failed to parse headers:', e);
      headers.value = [];
    }
  } else {
    headers.value = [];
  }
  
  // Reset ALL body-related state first
  jsonBody.value = '';
  rawBody.value = '';
  formDataParams.value = [];
  binaryFile.value = null;
  bodyFormat.value = 'none';
  
  // Load ALL body state from request if it exists
  const persistedBodyFormat = (request as HttpRequest & RequestDraftSnapshot).bodyFormat;
  if (persistedBodyFormat && BODY_FORMATS.includes(persistedBodyFormat)) {
    bodyFormat.value = persistedBodyFormat;
  }

  const persistedJsonBody = (request as HttpRequest & RequestDraftSnapshot).jsonBody;
  if (typeof persistedJsonBody === 'string') {
    jsonBody.value = persistedJsonBody;
  }

  const persistedRawBody = (request as HttpRequest & RequestDraftSnapshot).rawBody;
  if (typeof persistedRawBody === 'string') {
    rawBody.value = persistedRawBody;
  }

  const persistedRawContentType = (request as HttpRequest & RequestDraftSnapshot).rawContentType;
  if (typeof persistedRawContentType === 'string' && persistedRawContentType) {
    rawContentType.value = persistedRawContentType;
  }

  const persistedFormDataParams = (request as HttpRequest & RequestDraftSnapshot).formDataParams;
  if (Array.isArray(persistedFormDataParams)) {
    formDataParams.value = persistedFormDataParams.map(param => ({
      id: crypto.randomUUID(),
      key: param.key || '',
      value: param.value || '',
      enabled: param.enabled !== false,
      type: param.type === 'file' ? 'file' : 'text'
    }));
  }

  // Then set body from request if it exists
  if (request.body !== null && request.body !== undefined) {
    try {
      if (typeof request.body === 'string') {
        // Try to parse as JSON
        try {
          const bodyObj = JSON.parse(request.body);
          jsonBody.value = JSON.stringify(bodyObj, null, 2);
          bodyFormat.value = 'json';
        } catch {
          // Not JSON, treat as raw
          rawBody.value = request.body;
          bodyFormat.value = 'raw';
        }
      } else if (typeof request.body === 'object') {
        jsonBody.value = JSON.stringify(request.body, null, 2);
        bodyFormat.value = 'json';
      }
    } catch (e) {
      console.error('Error setting body:', e);
      bodyFormat.value = 'none';
      jsonBody.value = '';
    }
  } 
  
  // Reset auth state
  const authConfig = request.auth;
  if (!authConfig) {
    authType.value = 'none';
    apiKey.value = { key: '', value: '', addTo: 'header' };
    bearerToken.value = '';
    basicAuth.value = { username: '', password: '' };
  } else {
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
    } else if (type === 'oauth2' && authConfig.credentials) {
      oauth2.value.authUrl = authConfig.credentials.authUrl || '';
      oauth2.value.tokenUrl = authConfig.credentials.tokenUrl || '';
      oauth2.value.clientId = authConfig.credentials.clientId || '';
      oauth2.value.clientSecret = authConfig.credentials.clientSecret || '';
      oauth2.value.scopes = authConfig.credentials.scopes || '';
      oauth2.value.callbackUrl = authConfig.credentials.callbackUrl || '';
      oauth2.value.accessToken = authConfig.credentials.accessToken || '';
      oauth2.value.refreshToken = authConfig.credentials.refreshToken || '';
      oauth2.value.expiresAt = authConfig.credentials.expiresAt || null;
      oauth2.value.tokenType = authConfig.credentials.tokenType || 'Bearer';
      oauth2.value.grantType = authConfig.credentials.grantType || 'authorization_code';
      oauth2.value.PKCE = authConfig.credentials.PKCE || false;
    }
  }

  // Load mock configuration
  if (request.mockConfig) {
    mockConfig.value = request.mockConfig;
  } else {
    mockConfig.value = null;
  }

  // Load scripts
  preScript.value = request.preScript || '';
  postScript.value = request.postScript || '';

  // Load path variables
  pathVariables.value = [];
  if (request.pathVariables) {
    try {
      const pathVarsObj = typeof request.pathVariables === 'string'
        ? JSON.parse(request.pathVariables)
        : request.pathVariables;

      if (pathVarsObj && typeof pathVarsObj === 'object' && !Array.isArray(pathVarsObj)) {
        pathVariables.value = Object.entries(pathVarsObj).map(([key, config]) => {
          const varConfig = config as { value?: string; description?: string };
          return {
            id: crypto.randomUUID(),
            key,
            value: varConfig?.value || '',
            enabled: true,
            description: varConfig?.description || ''
          };
        });
      }
    } catch (e) {
      console.warn('Failed to parse path variables:', e);
      pathVariables.value = [];
    }
  }

  // Auto-detect path variables from URL
  const detectedVars = extractPathVariablesFromUrl(request.url);
  detectedVars.forEach(varName => {
    const existingVar = pathVariables.value.find(v => v.key === varName);
    if (!existingVar) {
      pathVariables.value.push({
        id: crypto.randomUUID(),
        key: varName,
        value: '',
        enabled: true,
        description: ''
      });
    }
  });

  // Only clear response and script logs on first load if no initial state provided
  // This preserves state when switching between tabs
  if (isFirstLoad.value) {
    if (props.initialResponse !== undefined) {
      response.value = props.initialResponse;
    } else {
      response.value = null;
    }
    
    if (props.initialScriptLogs !== undefined) {
      scriptLogs.value = props.initialScriptLogs;
    } else {
      scriptLogs.value = [];
    }
    
    if (props.initialActiveTab !== undefined) {
      activeTab.value = props.initialActiveTab;
    } else {
      activeTab.value = 'params';
    }
    
    isFirstLoad.value = false;
  }
  
  // Mark as loaded with snapshot
  lastLoadedRequestId.value = request.id;
  lastLoadedRequestSnapshot.value = snapshot;
};

// Watch for tab key changes - this ensures proper triggering on every tab switch
// Using tabKey instead of request.id to handle multiple tabs with same request (e.g., unsaved tabs with id: '')
watch(() => props.tabKey, () => {
  isFirstLoad.value = true;
  loadRequestData(props.request);
}, { immediate: true });

// Watch for state changes and emit them for persistence
// Using identity watchers (not deep) to avoid frequent large JSON serializations
// - response: watch identity changes (new response object)
// - activeTab: watch value changes directly
// - scriptLogs: watch identity changes (new array reference when logs are replaced)
// Using debounce to batch rapid changes (e.g., response + scriptLogs update together)
const emitStateChange = debounce((state: {
  response: any;
  activeTab: TabType;
  scriptLogs: any[];
}) => {
  emit('stateChange', state);
}, 100);

watch(
  () => ({
    response: response.value,
    activeTab: activeTab.value,
    scriptLogs: scriptLogs.value
  }),
  (newState, oldState) => {
    // Only emit if something actually changed (identity check)
    if (
      newState.response !== oldState?.response ||
      newState.activeTab !== oldState?.activeTab ||
      newState.scriptLogs !== oldState?.scriptLogs
    ) {
      emitStateChange({
        response: newState.response,
        activeTab: newState.activeTab,
        scriptLogs: newState.scriptLogs
      });
    }
  }
);

const updateUrlFromParams = () => {
  try {
    // Extract base URL (everything before '?')
    const baseUrlMatch = form.value.url.match(/^([^?]+)/);
    const baseUrl = baseUrlMatch ? baseUrlMatch[1] : form.value.url;
    
    // Build query string from params
    const enabledParams = queryParams.value.filter(p => p.enabled && p.key);
    if (enabledParams.length === 0) {
      form.value.url = baseUrl;
      return;
    }
    
    const queryString = enabledParams
      .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
      .join('&');
    
    form.value.url = `${baseUrl}?${queryString}`;
  } catch {
    // Silently fail if URL manipulation fails
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

// Watch URL changes to auto-detect path variables
watch(() => form.value.url, (newUrl) => {
  const detectedVars = extractPathVariablesFromUrl(newUrl);

  // Add new path variables that aren't already in the list
  detectedVars.forEach(varName => {
    const existingVar = pathVariables.value.find(v => v.key === varName);
    if (!existingVar) {
      addPathVariable(varName);
    }
  });

  // Remove path variables that no longer exist in URL
  // but only if they have empty values (preserve user's data)
  pathVariables.value = pathVariables.value.filter(v => {
    const stillExists = detectedVars.includes(v.key);
    if (stillExists) return true;
    // Keep if it has a value (user might want to reuse)
    return v.value !== '';
  });
}, { immediate: true });

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

const buildPathVariablesRecord = (): import('../../server/db/schema/savedRequest').RequestPathVariables => {
  const pathVarsRecord: import('../../server/db/schema/savedRequest').RequestPathVariables = {};
  pathVariables.value.forEach(variable => {
    if (variable.key) {
      pathVarsRecord[variable.key] = {
        value: variable.value,
        description: variable.description
      };
    }
  });
  return pathVarsRecord;
};

const buildDraftSnapshot = (): RequestDraftSnapshot => {
  const builtBody = buildBody();
  const normalizedBody = builtBody instanceof FormData || builtBody instanceof File
    ? null
    : (builtBody ?? null);

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
      } : authType.value === 'oauth2' ? {
        authUrl: oauth2.value.authUrl,
        tokenUrl: oauth2.value.tokenUrl,
        clientId: oauth2.value.clientId,
        clientSecret: oauth2.value.clientSecret,
        scopes: oauth2.value.scopes,
        callbackUrl: oauth2.value.callbackUrl,
        accessToken: oauth2.value.accessToken,
        refreshToken: oauth2.value.refreshToken,
        expiresAt: oauth2.value.expiresAt,
        tokenType: oauth2.value.tokenType,
        grantType: oauth2.value.grantType,
        PKCE: oauth2.value.PKCE
      } : undefined
  } || null;

  return {
    method: form.value.method,
    url: form.value.url,
    headers: buildHeadersRecord(),
    body: normalizedBody,
    auth: currentAuth,
    mockConfig: mockConfig.value,
    preScript: preScript.value,
    postScript: postScript.value,
    pathVariables: buildPathVariablesRecord(),
    bodyFormat: bodyFormat.value,
    jsonBody: jsonBody.value,
    rawBody: rawBody.value,
    rawContentType: rawContentType.value,
    formDataParams: formDataParams.value.map(param => ({
      key: param.key,
      value: param.value,
      enabled: param.enabled,
      type: param.type
    }))
  };
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
  } else if (authType.value === 'oauth2' && oauth2.value.accessToken) {
    authHeaders['Authorization'] = `${oauth2.value.tokenType} ${oauth2.value.accessToken}`;
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
  } else if (type === 'oauth2' && authConfig.credentials) {
    oauth2.value.authUrl = authConfig.credentials.authUrl || '';
    oauth2.value.tokenUrl = authConfig.credentials.tokenUrl || '';
    oauth2.value.clientId = authConfig.credentials.clientId || '';
    oauth2.value.clientSecret = authConfig.credentials.clientSecret || '';
    oauth2.value.scopes = authConfig.credentials.scopes || '';
    oauth2.value.callbackUrl = authConfig.credentials.callbackUrl || '';
    oauth2.value.accessToken = authConfig.credentials.accessToken || '';
    oauth2.value.refreshToken = authConfig.credentials.refreshToken || '';
    oauth2.value.expiresAt = authConfig.credentials.expiresAt || null;
    oauth2.value.tokenType = authConfig.credentials.tokenType || 'Bearer';
    oauth2.value.grantType = authConfig.credentials.grantType || 'authorization_code';
    oauth2.value.PKCE = authConfig.credentials.PKCE || false;
  }
};

const isTokenExpired = computed(() => {
  if (!oauth2.value.expiresAt) return false;
  return Date.now() > oauth2.value.expiresAt * 1000;
});

const getTokenTimeRemaining = computed(() => {
  if (!oauth2.value.expiresAt) return null;
  const remaining = oauth2.value.expiresAt * 1000 - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
});

const initiateOAuthFlow = async () => {
  if (!oauth2.value.authUrl || !oauth2.value.clientId) {
    tokenError.value = 'Please configure Auth URL and Client ID';
    return;
  }

  isGettingToken.value = true;
  tokenError.value = '';

  try {
    const callbackUrl = oauth2.value.callbackUrl || `${window.location.origin}/api/oauth/callback`;
    const state = crypto.randomUUID();
    const scope = oauth2.value.scopes || 'openid profile email';

    let authUrl = `${oauth2.value.authUrl}?response_type=code&client_id=${encodeURIComponent(oauth2.value.clientId)}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    if (oauth2.value.PKCE) {
      const codeVerifier = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      sessionStorage.setItem('oauth2_code_verifier', codeVerifier);
      authUrl += `&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    }

    sessionStorage.setItem('oauth2_state', state);
    sessionStorage.setItem('oauth2_callback_params', JSON.stringify({
      authUrl: oauth2.value.authUrl,
      tokenUrl: oauth2.value.tokenUrl,
      clientId: oauth2.value.clientId,
      clientSecret: oauth2.value.clientSecret,
      callbackUrl,
      scopes: scope,
      tokenType: oauth2.value.tokenType,
      grantType: oauth2.value.grantType,
      PKCE: oauth2.value.PKCE
    }));

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'oauth2authorize',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      tokenError.value = 'Popup was blocked. Please allow popups for this site.';
      isGettingToken.value = false;
      return;
    }

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        isGettingToken.value = false;
        checkForOAuthCallback();
      }
    }, 500);

  } catch (error: any) {
    tokenError.value = error.message || 'Failed to initiate OAuth flow';
    isGettingToken.value = false;
  }
};

const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const checkForOAuthCallback = async () => {
  const hash = window.location.hash;
  const search = window.location.search;

  if (hash.includes('code=') || search.includes('code=')) {
    await handleOAuthCallback();
  } else if (hash.includes('error=') || search.includes('error=')) {
    const urlParams = new URLSearchParams(hash.substring(1) || search.substring(1));
    tokenError.value = urlParams.get('error_description') || urlParams.get('error') || 'OAuth authorization failed';
  }
};

const handleOAuthCallback = async () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const storedState = sessionStorage.getItem('oauth2_state');
    const storedParams = sessionStorage.getItem('oauth2_callback_params');

    if (!code) {
      tokenError.value = 'No authorization code received';
      return;
    }

    if (state !== storedState) {
      tokenError.value = 'State mismatch - potential CSRF attack';
      return;
    }

    if (!storedParams) {
      tokenError.value = 'OAuth session expired. Please try again.';
      return;
    }

    const callbackParams = JSON.parse(storedParams);
    let tokenUrl = callbackParams.tokenUrl;

    if (!tokenUrl) {
      tokenError.value = 'Token URL not configured';
      return;
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackParams.callbackUrl,
      client_id: callbackParams.clientId
    };

    if (callbackParams.clientSecret) {
      body.client_secret = callbackParams.clientSecret;
    }

    if (callbackParams.PKCE) {
      const codeVerifier = sessionStorage.getItem('oauth2_code_verifier');
      if (codeVerifier) {
        body.code_verifier = codeVerifier;
      }
    }

    const response = await $fetch<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type?: string;
      error?: string;
      error_description?: string;
    }>(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(body).toString()
    });

    if (response.error) {
      tokenError.value = response.error_description || response.error;
      return;
    }

    oauth2.value.accessToken = response.access_token;
    oauth2.value.refreshToken = response.refresh_token || '';
    oauth2.value.tokenType = response.token_type || 'Bearer';
    oauth2.value.expiresAt = response.expires_in ? Math.floor(Date.now() / 1000) + response.expires_in : null;

    tokenError.value = '';

    clearOAuthSession();
    window.history.replaceState({}, document.title, window.location.pathname);

  } catch (error: any) {
    tokenError.value = error.data?.error_description || error.data?.error || error.message || 'Token exchange failed';
  }
};

const refreshAccessToken = async () => {
  if (oauth2.value.grantType === 'client_credentials') {
    await getClientCredentialsToken();
    return;
  }

  if (!oauth2.value.refreshToken || !oauth2.value.tokenUrl) {
    tokenError.value = 'No refresh token or token URL configured';
    return;
  }

  isGettingToken.value = true;
  tokenError.value = '';

  try {
    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      refresh_token: oauth2.value.refreshToken,
      client_id: oauth2.value.clientId
    };

    if (oauth2.value.clientSecret) {
      body.client_secret = oauth2.value.clientSecret;
    }

    const response = await $fetch<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type?: string;
      error?: string;
      error_description?: string;
    }>(oauth2.value.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(body).toString()
    });

    if (response.error) {
      tokenError.value = response.error_description || response.error;
      return;
    }

    oauth2.value.accessToken = response.access_token;
    oauth2.value.refreshToken = response.refresh_token || oauth2.value.refreshToken;
    oauth2.value.tokenType = response.token_type || 'Bearer';
    oauth2.value.expiresAt = response.expires_in ? Math.floor(Date.now() / 1000) + response.expires_in : null;

    tokenError.value = '';

  } catch (error: any) {
    tokenError.value = error.data?.error_description || error.data?.error || error.message || 'Token refresh failed';
  } finally {
    isGettingToken.value = false;
  }
};

const getClientCredentialsToken = async () => {
  if (!oauth2.value.tokenUrl || !oauth2.value.clientId) {
    tokenError.value = 'Please configure Token URL and Client ID';
    return;
  }

  isGettingToken.value = true;
  tokenError.value = '';

  try {
    const body: Record<string, string> = {
      grant_type: 'client_credentials',
      client_id: oauth2.value.clientId
    };

    if (oauth2.value.clientSecret) {
      body.client_secret = oauth2.value.clientSecret;
    }

    if (oauth2.value.scopes) {
      body.scope = oauth2.value.scopes;
    }

    const response = await $fetch<{
      access_token: string;
      expires_in?: number;
      token_type?: string;
      error?: string;
      error_description?: string;
    }>(oauth2.value.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(body).toString()
    });

    if (response.error) {
      tokenError.value = response.error_description || response.error;
      return;
    }

    oauth2.value.accessToken = response.access_token;
    oauth2.value.tokenType = response.token_type || 'Bearer';
    oauth2.value.expiresAt = response.expires_in ? Math.floor(Date.now() / 1000) + response.expires_in : null;
    oauth2.value.refreshToken = '';

    tokenError.value = '';

  } catch (error: any) {
    tokenError.value = error.data?.error_description || error.data?.error || error.message || 'Failed to get access token';
  } finally {
    isGettingToken.value = false;
  }
};

const clearOAuthSession = () => {
  sessionStorage.removeItem('oauth2_state');
  sessionStorage.removeItem('oauth2_callback_params');
  sessionStorage.removeItem('oauth2_code_verifier');
};

const clearTokens = () => {
  oauth2.value.accessToken = '';
  oauth2.value.refreshToken = '';
  oauth2.value.expiresAt = null;
  tokenError.value = '';
};

const autoRefreshToken = async () => {
  if (!oauth2.value.accessToken || !oauth2.value.expiresAt) {
    return;
  }

  const timeUntilExpiry = oauth2.value.expiresAt * 1000 - Date.now();
  const refreshThreshold = 5 * 60 * 1000;

  if (timeUntilExpiry < refreshThreshold && timeUntilExpiry > 0) {
    if (oauth2.value.grantType === 'client_credentials') {
      await getClientCredentialsToken();
    } else if (oauth2.value.refreshToken) {
      await refreshAccessToken();
    }
  }
};

const storeTokensInEnvironment = async () => {
  if (!props.environmentId || !oauth2.value.accessToken) return;

  const tokenVariableName = `OAUTH_ACCESS_TOKEN`;
  const refreshVariableName = `OAUTH_REFRESH_TOKEN`;
  const expiresVariableName = `OAUTH_TOKEN_EXPIRES_AT`;

  try {
    await $fetch('/api/oauth/store-tokens', {
      method: 'POST',
      body: {
        environmentId: props.environmentId,
        accessTokenKey: tokenVariableName,
        refreshTokenKey: refreshVariableName,
        expiresAtKey: expiresVariableName,
        accessToken: oauth2.value.accessToken,
        refreshToken: oauth2.value.refreshToken,
        expiresAt: oauth2.value.expiresAt
      }
    });

    await fetchEnvironmentVariables();
  } catch (error: any) {
    console.error('Failed to store tokens:', error);
    tokenError.value = 'Failed to store tokens in environment';
  }
};

const fetchEnvironmentVariables = async () => {
  if (props.environmentId) {
    try {
      const variables = await $fetch<Variable[]>(`/api/admin/environments/${props.environmentId}/variables`);
      environmentVariables.value = variables;
    } catch (error) {
      console.error('Failed to fetch environment variables:', error);
    }
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
  const currentMethod = form.value.method;
  const currentHeaders = buildHeadersRecord();
  const currentBody = buildBody();
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
  const currentPathVariables = buildPathVariablesRecord();

  // Use lastSavedState if available (after a save), otherwise use props.request
  const compareState = lastSavedState.value || {
    method: props.request.method,
    url: props.request.url,
    headers: props.request.headers,
    body: props.request.body,
    auth: props.request.auth,
    mockConfig: props.request.mockConfig,
    preScript: props.request.preScript,
    postScript: props.request.postScript,
    pathVariables: props.request.pathVariables
  };

  const urlChanged = currentUrl !== compareState.url;
  const methodChanged = currentMethod !== compareState.method;
  const headersChanged = JSON.stringify(currentHeaders) !== JSON.stringify(compareState.headers || {});
  const normalizedCurrentBody = currentBody === undefined ? null : currentBody;
  const normalizedOriginalBody = compareState.body === undefined ? null : compareState.body;
  const bodyChanged = JSON.stringify(normalizedCurrentBody) !== JSON.stringify(normalizedOriginalBody);
  const authChanged = JSON.stringify(currentAuth) !== JSON.stringify(compareState.auth || {});
  const mockConfigChanged = JSON.stringify(mockConfig.value) !== JSON.stringify(compareState.mockConfig || null);
  const preScriptChanged = (preScript.value || '') !== (compareState.preScript || '');
  const postScriptChanged = (postScript.value || '') !== (compareState.postScript || '');
  const pathVarsChanged = JSON.stringify(currentPathVariables) !== JSON.stringify(compareState.pathVariables || {});

  return urlChanged || methodChanged || headersChanged || bodyChanged || authChanged || mockConfigChanged || preScriptChanged || postScriptChanged || pathVarsChanged;
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

const isImageResponse = () => {
  const contentType = getContentType();
  return contentType.includes('image/');
};

const getImageData = () => {
  if (!response.value || !('success' in response.value) || !response.value.body) {
    return null;
  }
  const body = response.value.body;
  // Handle binary response format from server
  if (body._binary && body.data) {
    const contentType = getContentType();
    return {
      src: `data:${contentType};base64,${body.data}`,
      mimeType: contentType,
      size: body.size || 0
    };
  }
  return null;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

// Save response as example functions
const openSaveExampleModal = () => {
  if (!response.value || !('success' in response.value) || !response.value.success) {
    return;
  }
  
  // Auto-suggest name based on status code
  const status = response.value.status;
  let suggestedName = '';
  
  const statusTextMap: Record<number, string> = {
    200: 'Success Response',
    201: 'Created Response',
    204: 'No Content Response',
    400: 'Bad Request Response',
    401: 'Unauthorized Response',
    403: 'Forbidden Response',
    404: 'Not Found Response',
    409: 'Conflict Response',
    422: 'Validation Error Response',
    500: 'Server Error Response',
    502: 'Bad Gateway Response',
    503: 'Service Unavailable Response'
  };
  
  suggestedName = statusTextMap[status] || `${status} Response`;
  
  saveExampleName.value = suggestedName;
  saveExampleIsDefault.value = false;
  saveExampleError.value = null;
  saveExampleSuccess.value = false;
  showSaveExampleModal.value = true;
};

const closeSaveExampleModal = () => {
  showSaveExampleModal.value = false;
  saveExampleName.value = '';
  saveExampleIsDefault.value = false;
  saveExampleError.value = null;
  saveExampleSuccess.value = false;
};

const saveResponseAsExample = async () => {
  if (!response.value || !('success' in response.value) || !response.value.success) {
    return;
  }
  
  if (!saveExampleName.value.trim()) {
    saveExampleError.value = 'Example name is required';
    return;
  }
  
  saveExampleLoading.value = true;
  saveExampleError.value = null;
  saveExampleSuccess.value = false;
  
  try {
    const res = response.value;
    
    // Prepare headers - filter out non-serializable headers
    const headersToSave: Record<string, string> = {};
    if (res.headers) {
      Object.entries(res.headers).forEach(([key, value]) => {
        // Skip binary/Set-Cookie headers that might be arrays
        if (typeof value === 'string') {
          headersToSave[key] = value;
        }
      });
    }
    
    // Prepare body - extract actual data
    let bodyToSave: Record<string, unknown> | string | null = null;
    if (res.body !== null && res.body !== undefined) {
      if (typeof res.body === 'object') {
        // Handle binary response format
        if (res.body._binary && res.body.data) {
          // For binary responses, save a placeholder or the base64 data
          bodyToSave = { _type: 'binary', size: res.body.size || 0 };
        } else {
          bodyToSave = res.body as Record<string, unknown>;
        }
      } else if (typeof res.body === 'string') {
        // Try to parse as JSON, if it fails, save as string
        try {
          bodyToSave = JSON.parse(res.body);
        } catch {
          bodyToSave = res.body;
        }
      }
    }
    
    await $fetch(`/api/admin/requests/${props.request.id}/examples`, {
      method: 'POST',
      body: {
        name: saveExampleName.value.trim(),
        statusCode: res.status,
        headers: Object.keys(headersToSave).length > 0 ? headersToSave : null,
        body: bodyToSave,
        isDefault: saveExampleIsDefault.value
      }
    });
    
    saveExampleSuccess.value = true;
    
    // Close modal after a short delay
    setTimeout(() => {
      closeSaveExampleModal();
    }, 1500);
    
  } catch (err: any) {
    saveExampleError.value = err.message || 'Failed to save example';
    console.error('Error saving response as example:', err);
  } finally {
    saveExampleLoading.value = false;
  }
};

const getResponsePreview = () => {
  if (!response.value || !('success' in response.value) || !response.value.success) {
    return '';
  }
  
  const res = response.value;
  const preview: Record<string, unknown> = {
    status: res.status,
    statusText: res.statusText
  };
  
  // Add headers preview (limited)
  if (res.headers && Object.keys(res.headers).length > 0) {
    const headerCount = Object.keys(res.headers).length;
    preview.headers = headerCount > 5 
      ? `${headerCount} headers (will be saved)` 
      : res.headers;
  }
  
  // Add body preview
  if (res.body !== null && res.body !== undefined) {
    if (typeof res.body === 'object') {
      if (res.body._binary) {
        preview.body = `[Binary data: ${res.body.size || 0} bytes]`;
      } else {
        const bodyStr = JSON.stringify(res.body);
        // Truncate string representation for preview (not parseable JSON, just for display)
        preview.body = bodyStr.length > 200 
          ? bodyStr.substring(0, 200) + '... (truncated)'
          : res.body;
      }
    } else if (typeof res.body === 'string') {
      preview.body = res.body.length > 200 
        ? res.body.substring(0, 200) + '...'
        : res.body;
    }
  }
  
  return JSON.stringify(preview, null, 2);
};

const getJsonPreviewHtml = () => {
  if (!response.value || !('success' in response.value)) return '';

  const body = response.value.body;
  let jsonStr = '';
  if (typeof body === 'string') {
    try {
      jsonStr = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      jsonStr = body;
    }
  } else if (typeof body === 'object') {
    jsonStr = JSON.stringify(body, null, 2);
  } else {
    jsonStr = String(body);
  }

  const escaped = escapeHtml(jsonStr);

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, Monaco, monospace;
      font-size: 13px;
      line-height: 1.6;
      padding: 16px;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    pre { white-space: pre-wrap; word-wrap: break-word; }
    .string { color: #7ee787; }
    .number { color: #79c0ff; }
    .boolean { color: #ff7b72; }
    .null { color: #ff7b72; }
    .key { color: #dcdcaa; }
  </style>
</head>
<body>
  <pre>${escaped}</pre>
  <script>
    (function() {
      const pre = document.querySelector('pre');
      let html = pre.innerHTML;
      html = html.replace(/"([^"]+)":/g, '<span class="key">"$1"</span>:');
      html = html.replace(/: "([^"]*)"/g, ': <span class="string">"$1"</span>');
      html = html.replace(/: (\d+\.?\d*)/g, ': <span class="number">$1</span>');
      html = html.replace(/: (true|false)/g, ': <span class="boolean">$1</span>');
      html = html.replace(/: (null)/g, ': <span class="null">$1</span>');
      pre.innerHTML = html;
    })();
  <\/script>
</body>
</html>`;
};

const insertSnippet = (type: 'pre' | 'post', snippet: string) => {
  const snippets: Record<string, string> = {
    'env-get': `const value = pm.environment.get("key");`,
    'env-set': `pm.environment.set("key", "value");`,
    'request': `// Access request properties\npm.request.headers["X-Custom"] = "value";`,
    'console': `console.log("message", value);`,
    'response-code': `if (pm.response.code === 200) {\n  console.log("Success!");\n}`,
    'response-json': `const json = pm.response.json();`,
    'response-time': `console.log("Response time:", pm.response.responseTime + "ms");`,
    'response-size': `console.log("Response size:", pm.response.size + " bytes");`,
    'status': `const status = pm.response.status;`
  };

  const code = snippets[snippet] || '';
  if (type === 'pre') {
    preScript.value = preScript.value ? preScript.value + '\n' + code : code;
  } else {
    postScript.value = postScript.value ? postScript.value + '\n' + code : code;
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

  updateSearchMatches(false);
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

  updateSearchMatches(false);
};

const collapseAll = () => {
  expandedNodes.value.clear();
  updateSearchMatches(false);
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

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const getHighlightedJson = computed(() => {
  if (!response.value || !('success' in response.value)) return null;
  
  const body = response.value.body;
  if (typeof body !== 'object') return null;
  
  return highlightJson(body);
});

const focusResponseSearchInput = () => {
  nextTick(() => {
    const searchInput = document.querySelector('#response-search-input') as HTMLInputElement;
    searchInput?.focus();
    searchInput?.select();
  });
};

const clearActiveSearchMatch = () => {
  searchMatches.value.forEach((element) => {
    element.classList.remove('response-search-highlight-active');
  });
};

const focusSearchMatch = (index: number) => {
  if (index < 0 || index >= searchMatches.value.length) {
    activeSearchMatchIndex.value = -1;
    clearActiveSearchMatch();
    return;
  }

  clearActiveSearchMatch();
  activeSearchMatchIndex.value = index;

  const activeMatch = searchMatches.value[index];
  if (!activeMatch) return;

  activeMatch.classList.add('response-search-highlight-active');
  activeMatch.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
};

const updateSearchMatches = async (resetToFirstMatch = true) => {
  await nextTick();

  clearActiveSearchMatch();

  if (
    !searchQuery.value.trim() ||
    activeTab.value !== 'response' ||
    responseViewType.value !== 'pretty' ||
    !responseContentRef.value
  ) {
    searchMatches.value = [];
    activeSearchMatchIndex.value = -1;
    return;
  }

  const highlightedElements = Array.from(
    responseContentRef.value.querySelectorAll<HTMLElement>('.response-search-highlight')
  );

  searchMatches.value = highlightedElements;

  if (searchMatches.value.length === 0) {
    activeSearchMatchIndex.value = -1;
    return;
  }

  const targetIndex = resetToFirstMatch
    ? 0
    : Math.min(
      Math.max(activeSearchMatchIndex.value, 0),
      searchMatches.value.length - 1
    );

  focusSearchMatch(targetIndex);
};

const goToNextSearchMatch = () => {
  if (searchMatches.value.length === 0) return;

  const nextIndex = activeSearchMatchIndex.value + 1 >= searchMatches.value.length
    ? 0
    : activeSearchMatchIndex.value + 1;

  focusSearchMatch(nextIndex);
};

const goToPreviousSearchMatch = () => {
  if (searchMatches.value.length === 0) return;

  const previousIndex = activeSearchMatchIndex.value - 1 < 0
    ? searchMatches.value.length - 1
    : activeSearchMatchIndex.value - 1;

  focusSearchMatch(previousIndex);
};

const handleSearchInputEnter = (event: KeyboardEvent) => {
  if (event.shiftKey) {
    goToPreviousSearchMatch();
    return;
  }

  goToNextSearchMatch();
};

const openResponseSearch = () => {
  showSearch.value = true;
  focusResponseSearchInput();
};

const closeResponseSearch = () => {
  showSearch.value = false;
  searchQuery.value = '';
  searchMatches.value = [];
  activeSearchMatchIndex.value = -1;
  clearActiveSearchMatch();
};

watch(searchQuery, () => {
  updateSearchMatches(true);
});

watch([responseViewType, activeTab], () => {
  updateSearchMatches(true);
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
    openResponseSearch();
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
        } : authType.value === 'oauth2' ? {
          authUrl: oauth2.value.authUrl,
          tokenUrl: oauth2.value.tokenUrl,
          clientId: oauth2.value.clientId,
          clientSecret: oauth2.value.clientSecret,
          scopes: oauth2.value.scopes,
          callbackUrl: oauth2.value.callbackUrl,
          accessToken: oauth2.value.accessToken,
          refreshToken: oauth2.value.refreshToken,
          expiresAt: oauth2.value.expiresAt,
          tokenType: oauth2.value.tokenType,
          grantType: oauth2.value.grantType,
          PKCE: oauth2.value.PKCE
        } : undefined
    } || null,
    mockConfig: mockConfig.value,
    preScript: preScript.value,
    postScript: postScript.value,
    pathVariables: buildPathVariablesRecord(),
    order: props.request.order,
    createdAt: props.request.createdAt,
    updatedAt: new Date()
  });

  // Capture current state as saved to immediately update UI feedback
  captureCurrentStateAsSaved();
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
        } : authType.value === 'oauth2' ? {
          authUrl: oauth2.value.authUrl,
          tokenUrl: oauth2.value.tokenUrl,
          clientId: oauth2.value.clientId,
          clientSecret: oauth2.value.clientSecret,
          scopes: oauth2.value.scopes,
          callbackUrl: oauth2.value.callbackUrl,
          accessToken: oauth2.value.accessToken,
          refreshToken: oauth2.value.refreshToken,
          expiresAt: oauth2.value.expiresAt,
          tokenType: oauth2.value.tokenType,
          grantType: oauth2.value.grantType,
          PKCE: oauth2.value.PKCE
        } : undefined
    } || null,
    mockConfig: mockConfig.value || {
      isEnabled: true,
      statusCode: 200,
      delay: 0,
      responseBody: { message: 'Mock response' },
      responseHeaders: { 'Content-Type': 'application/json' }
    },
    preScript: preScript.value,
    postScript: postScript.value,
    pathVariables: buildPathVariablesRecord(),
    order: props.request.order,
    createdAt: props.request.createdAt,
    updatedAt: new Date()
  });
}

watch(() => form.value.url, (newUrl) => {
  const params = parseUrlQuery(newUrl);
  // Only update params if the URL params are different from current params
  // and we're not currently editing params (to avoid losing focus)
  const currentParamsStr = JSON.stringify(queryParams.value.map(p => ({ key: p.key, value: p.value, enabled: p.enabled })));
  const newParamsStr = JSON.stringify(params.map(p => ({ key: p.key, value: p.value, enabled: p.enabled })));
  
  if (currentParamsStr !== newParamsStr) {
    // Merge params: keep existing params with their IDs, add new ones, remove deleted ones
    const mergedParams: QueryParam[] = [];
    const existingParamsMap = new Map(queryParams.value.map(p => [p.key, p]));
    
    for (const newParam of params) {
      const existingParam = existingParamsMap.get(newParam.key);
      if (existingParam) {
        // Update existing param value if changed
        if (existingParam.value !== newParam.value || existingParam.enabled !== newParam.enabled) {
          existingParam.value = newParam.value;
          existingParam.enabled = newParam.enabled;
        }
        mergedParams.push(existingParam);
      } else {
        // Add new param
        mergedParams.push(newParam);
      }
    }
    
    queryParams.value = mergedParams;
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
  emit('unsavedChanges', props.request, newValue, buildDraftSnapshot());
});

onMounted(() => {
  headers.value = parseHeadersFromRequest(props.request.headers);
  parseAuthFromRequest(props.request.auth);
  checkForOAuthCallback();
  fetchEnvironmentVariables();
});

watch(() => props.environmentId, () => {
  fetchEnvironmentVariables();
});

const sendRequest = async () => {
  if (!form.value.url) return;

  if (authType.value === 'oauth2' && oauth2.value.accessToken) {
    await autoRefreshToken();
  }

  isLoading.value = true;
  response.value = null;
  scriptLogs.value = [];
  activeTab.value = 'response';
  searchQuery.value = '';
  showSearch.value = false;
  searchMatches.value = [];
  activeSearchMatchIndex.value = -1;
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

    // Apply path variable substitution
    requestUrl = resolvePathVariables(requestUrl);

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
        workspaceId: props.workspaceId,
        environmentId: props.environmentId,
        savedRequestId: props.request.id || undefined
      }
    });

    response.value = result;
    // Capture script logs from response
    if (result.scriptLogs && result.scriptLogs.length > 0) {
      scriptLogs.value = result.scriptLogs;
    }
    if (responseViewType.value === 'pretty') {
      expandAll();
    }

    // Track request execution for analytics
    const isSuccess = 'success' in result && result.success;
    const statusCode = 'status' in result ? result.status : undefined;
    const responseTimeMs = result.timing?.durationMs;
    
    trackRequestExecution({
      method: form.value.method,
      url: requestUrl,
      statusCode,
      responseTimeMs,
      success: isSuccess,
      requestId: props.request.id || undefined,
      requestName: props.request.name,
      workspaceId: props.workspaceId,
    });
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

    // Track failed request execution for analytics
    trackRequestExecution({
      method: form.value.method,
      url: form.value.url,
      success: false,
      requestId: props.request.id || undefined,
      requestName: props.request.name,
      workspaceId: props.workspaceId,
    });
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

// Expose current request state for CodeExamples component
defineExpose({
  form,
  headers,
  queryParams,
  pathVariables,
  bodyFormat,
  jsonBody,
  rawBody,
  authType,
  bearerToken,
  basicAuth,
  apiKey
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
              v-if="hasUnsavedChanges && !readOnly"
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
        <div v-if="!readOnly" class="flex items-center gap-2">
          <button 
            @click="openSaveAsDialog"
            class="py-1.5 px-3 bg-bg-input text-text-secondary rounded border border-border-default cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save as new request (Cmd+Shift+S)"
          >
            Save As
          </button>
          <button 
            @click="openSaveDialog"
            :disabled="!hasUnsavedChanges"
            :class="[
              'py-1.5 px-3 rounded border-none text-xs font-medium transition-all duration-fast',
              hasUnsavedChanges 
                ? 'bg-accent-blue text-white cursor-pointer hover:bg-[#1976D2]' 
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
            ]"
            :title="hasUnsavedChanges ? 'Save request (Cmd+S)' : 'No changes to save'"
          >
            Save
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="text-xs text-text-muted px-2 py-1 bg-bg-tertiary rounded">
            View Only
          </span>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="p-4 border-b border-border-default bg-bg-secondary">
        <div class="flex gap-2 bg-bg-input border border-border-default rounded-lg p-1 min-w-0">
          <select 
            v-model="form.method" 
            :class="[
              'py-2.5 px-3 bg-transparent border-none border-r border-border-default font-semibold text-sm cursor-pointer min-w-[100px] shrink-0 focus:outline-none',
              methodColors[form.method] || 'text-text-primary'
            ]"
          >
            <option v-for="m in HTTP_METHODS" :key="m" :value="m">{{ m }}</option>
          </select>
          <VariableInput
            v-model="form.url"
            :variables="environmentVariables"
            :path-variables="pathVariables.filter(v => v.enabled).map(v => v.key)"
            placeholder="https://api.example.com/endpoint"
            class="flex-1 min-w-0 py-2.5 px-3 bg-transparent border-none text-text-primary font-mono text-sm focus:outline-none placeholder:text-text-muted overflow-hidden"
            @keyup.enter="sendRequest"
          />
          <button 
            class="shrink-0 py-2.5 px-8 bg-accent-blue text-white font-semibold rounded-md border-none cursor-pointer transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" 
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
            v-for="tab in (readOnly ? ['params', 'headers', 'body', 'auth', 'examples', 'response'] : ['params', 'headers', 'body', 'auth', 'preScript', 'postScript', 'mock', 'examples', 'response']) as TabType[]"
            :key="tab"
            @click="activeTab = tab"
            class="px-4 py-3 text-xs font-medium capitalize transition-all duration-fast border-b-2 focus:outline-none whitespace-nowrap"
            :class="[
              activeTab === tab
                ? 'border-accent-blue text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            ]"
          >
            {{ tab === 'preScript' ? 'Pre-Script' : tab === 'postScript' ? 'Post-Script' : tab }}
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
                  class="flex-1 min-w-0"
                />
                <VariableInput
                  :model-value="param.value"
                  @update:model-value="updateQueryParam(param.id, 'value', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Value"
                  class="flex-1 min-w-0"
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

            <!-- Path Variables Section -->
            <div class="mt-6 border-t border-border-default pt-4">
              <div class="px-2 pb-2 flex items-center justify-between">
                <span class="text-xs font-medium text-text-secondary">Path Variables</span>
                <span class="text-xs text-text-muted">{{ pathVariables.filter(v => v.enabled).length }} variables</span>
              </div>

              <div v-if="pathVariables.length === 0" class="px-2 py-4 text-center text-xs text-text-muted">
                No path variables detected. Add variables to your URL using <code class="px-1 py-0.5 bg-bg-tertiary rounded">:variableName</code> syntax.
              </div>

              <div v-else class="space-y-1">
                <div
                  v-for="variable in pathVariables"
                  :key="variable.id"
                  class="flex items-center gap-2 py-2 px-2 rounded hover:bg-bg-hover transition-colors duration-fast group"
                >
                  <input
                    type="checkbox"
                    :checked="variable.enabled"
                    @change="updatePathVariable(variable.id, 'enabled', ($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                  />
                  <div class="flex-1 min-w-0">
                    <code class="text-xs text-text-secondary bg-bg-tertiary px-2 py-1 rounded">:{{ variable.key }}</code>
                  </div>
                  <VariableInput
                    :model-value="variable.value"
                    @update:model-value="updatePathVariable(variable.id, 'value', $event)"
                    :disabled="!variable.enabled"
                    :variables="environmentVariables"
                    placeholder="Value"
                    class="flex-1 min-w-0"
                  />
                  <input
                    :value="variable.description"
                    @input="updatePathVariable(variable.id, 'description', ($event.target as HTMLInputElement).value)"
                    :disabled="!variable.enabled"
                    placeholder="Description"
                    class="flex-1 min-w-0 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    @click="removePathVariable(variable.id)"
                    class="p-1.5 text-text-muted hover:text-accent-red opacity-0 group-hover:opacity-100 transition-all duration-fast focus:opacity-100 focus:outline-none"
                    title="Remove path variable"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
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
                  class="flex-1 min-w-0"
                />
                <VariableInput
                  :model-value="header.value"
                  @update:model-value="updateHeader(header.id, 'value', $event)"
                  :disabled="!header.enabled"
                  :variables="environmentVariables"
                  placeholder="Header Value"
                  class="flex-1 min-w-0"
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
                  class="flex-1 min-w-0"
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
                <div v-if="param.type === 'text'" class="flex-1 min-w-0">
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
                  class="flex-1 min-w-0"
                />
                <VariableInput
                  :model-value="param.value"
                  @update:model-value="updateFormDataParam(param.id, 'value', $event)"
                  :disabled="!param.enabled"
                  :variables="environmentVariables"
                  placeholder="Value"
                  class="flex-1 min-w-0"
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
                  <option value="oauth2">OAuth 2.0</option>
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

              <div v-if="authType === 'oauth2'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-semibold text-text-primary">OAuth 2.0 Configuration</h4>
                  <div class="flex items-center gap-2">
                    <button
                      @click="oauth2.grantType = oauth2.grantType === 'authorization_code' ? 'client_credentials' : 'authorization_code'"
                      class="text-xs text-accent-blue hover:text-accent-blue/80"
                    >
                      Switch to {{ oauth2.grantType === 'authorization_code' ? 'Client Credentials' : 'Authorization Code' }}
                    </button>
                  </div>
                </div>

                <div class="space-y-3 p-3 bg-bg-tertiary rounded border border-border-default">
                  <div class="space-y-2">
                    <label class="text-xs font-medium text-text-secondary">Grant Type</label>
                    <select
                      v-model="oauth2.grantType"
                      class="w-full py-2 px-3 bg-bg-input border border-border-default rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                    >
                      <option value="authorization_code">Authorization Code</option>
                      <option value="client_credentials">Client Credentials</option>
                    </select>
                  </div>

                  <div v-if="oauth2.grantType === 'authorization_code'" class="space-y-2">
                    <label class="text-xs font-medium text-text-secondary">Auth URL</label>
                    <VariableInput
                      v-model="oauth2.authUrl"
                      :variables="environmentVariables"
                      placeholder="https://example.com/oauth/authorize"
                      class="w-full"
                    />
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-medium text-text-secondary">Access Token URL</label>
                    <VariableInput
                      v-model="oauth2.tokenUrl"
                      :variables="environmentVariables"
                      placeholder="https://example.com/oauth/token"
                      class="w-full"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-2">
                      <label class="text-xs font-medium text-text-secondary">Client ID</label>
                      <VariableInput
                        v-model="oauth2.clientId"
                        :variables="environmentVariables"
                        placeholder="Enter client ID"
                        class="w-full"
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="text-xs font-medium text-text-secondary">Client Secret</label>
                      <VariableInput
                        v-model="oauth2.clientSecret"
                        :variables="environmentVariables"
                        type="password"
                        placeholder="Enter client secret"
                        class="w-full"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="text-xs font-medium text-text-secondary">Scopes</label>
                    <VariableInput
                      v-model="oauth2.scopes"
                      :variables="environmentVariables"
                      placeholder="openid profile email"
                      class="w-full"
                    />
                    <p class="text-[10px] text-text-muted">Space-separated list of scopes</p>
                  </div>

                  <div v-if="oauth2.grantType === 'authorization_code'" class="space-y-2">
                    <label class="text-xs font-medium text-text-secondary">Callback URL</label>
                    <VariableInput
                      v-model="oauth2.callbackUrl"
                      :variables="environmentVariables"
                      :placeholder="`${window.location.origin}/api/oauth/callback`"
                      class="w-full"
                    />
                    <p class="text-[10px] text-text-muted">Must match the callback URL configured in your OAuth provider</p>
                  </div>

                  <label v-if="oauth2.grantType === 'authorization_code'" class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="oauth2.PKCE"
                      class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue focus:ring-offset-bg-secondary cursor-pointer"
                    />
                    <span class="text-xs text-text-secondary">Enable PKCE</span>
                  </label>
                </div>

                <div v-if="oauth2.grantType === 'authorization_code'" class="space-y-3">
                  <button
                    @click="initiateOAuthFlow"
                    :disabled="isGettingToken || !oauth2.authUrl || !oauth2.tokenUrl || !oauth2.clientId"
                    class="w-full py-2.5 px-4 bg-accent-blue text-white rounded font-medium text-sm transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg v-if="isGettingToken" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    {{ isGettingToken ? 'Authenticating...' : 'Get New Access Token' }}
                  </button>

                  <div v-if="tokenError" class="p-3 bg-accent-red/10 border border-accent-red/30 rounded text-xs text-accent-red">
                    {{ tokenError }}
                  </div>

                  <div v-if="oauth2.accessToken" class="space-y-3 p-3 bg-bg-tertiary rounded border border-border-default">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-text-primary">Token Status</span>
                      <div class="flex items-center gap-2">
                        <span
                          class="px-2 py-0.5 rounded text-[10px] font-semibold"
                          :class="isTokenExpired ? 'bg-accent-red/15 text-accent-red' : 'bg-accent-green/15 text-accent-green'"
                        >
                          {{ isTokenExpired ? 'Expired' : 'Active' }}
                        </span>
                        <span v-if="getTokenTimeRemaining" class="text-xs text-text-muted">{{ getTokenTimeRemaining }}</span>
                      </div>
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs font-medium text-text-secondary">Access Token</label>
                      <VariableInput
                        v-model="oauth2.accessToken"
                        :variables="environmentVariables"
                        type="password"
                        placeholder="Access token"
                        class="w-full"
                      />
                    </div>

                    <div v-if="oauth2.refreshToken" class="space-y-2">
                      <label class="text-xs font-medium text-text-secondary">Refresh Token</label>
                      <VariableInput
                        v-model="oauth2.refreshToken"
                        :variables="environmentVariables"
                        type="password"
                        placeholder="Refresh token"
                        class="w-full"
                      />
                    </div>

                    <div class="flex gap-2">
                      <button
                        @click="refreshAccessToken"
                        :disabled="isGettingToken || !oauth2.refreshToken || !oauth2.tokenUrl"
                        class="flex-1 py-2 px-3 bg-bg-input border border-border-default rounded text-xs font-medium text-text-secondary hover:border-accent-blue transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Refresh Token
                      </button>
                      <button
                        @click="storeTokensInEnvironment"
                        :disabled="!props.environmentId"
                        class="flex-1 py-2 px-3 bg-bg-input border border-border-default rounded text-xs font-medium text-text-secondary hover:border-accent-green hover:text-accent-green transition-colors duration-fast disabled:opacity50 disabled:cursor-not-allowed"
                        title="Store tokens in environment variables"
                      >
                        Store in Env
                      </button>
                      <button
                        @click="clearTokens"
                        class="flex-1 py-2 px-3 bg-bg-input border border-border-default rounded text-xs font-medium text-text-secondary hover:text-accent-red hover:border-accent-red transition-colors duration-fast"
                      >
                        Clear Tokens
                      </button>
                    </div>
                  </div>

                  <div v-if="!oauth2.accessToken" class="p-4 text-center text-text-muted text-sm">
                    <p class="mb-2">Click "Get New Access Token" to initiate the OAuth 2.0 authorization flow</p>
                    <p class="text-xs">A popup window will open for authentication with the OAuth provider</p>
                  </div>
                </div>

                <div v-else-if="oauth2.grantType === 'client_credentials'" class="space-y-3">
                  <button
                    @click="getClientCredentialsToken"
                    :disabled="isGettingToken || !oauth2.tokenUrl || !oauth2.clientId"
                    class="w-full py-2.5 px-4 bg-accent-blue text-white rounded font-medium text-sm transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg v-if="isGettingToken" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                      <polyline points="10 17 15 12 10 7"></polyline>
                      <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    {{ isGettingToken ? 'Getting Token...' : 'Get Access Token' }}
                  </button>

                  <div v-if="tokenError" class="p-3 bg-accent-red/10 border border-accent-red/30 rounded text-xs text-accent-red">
                    {{ tokenError }}
                  </div>

                  <div v-if="oauth2.accessToken" class="space-y-3 p-3 bg-bg-tertiary rounded border border-border-default">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-text-primary">Token Status</span>
                      <div class="flex items-center gap-2">
                        <span
                          class="px-2 py-0.5 rounded text-[10px] font-semibold"
                          :class="isTokenExpired ? 'bg-accent-red/15 text-accent-red' : 'bg-accent-green/15 text-accent-green'"
                        >
                          {{ isTokenExpired ? 'Expired' : 'Active' }}
                        </span>
                        <span v-if="getTokenTimeRemaining" class="text-xs text-text-muted">{{ getTokenTimeRemaining }}</span>
                      </div>
                    </div>

                    <div class="space-y-2">
                      <label class="text-xs font-medium text-text-secondary">Access Token</label>
                      <VariableInput
                        v-model="oauth2.accessToken"
                        :variables="environmentVariables"
                        type="password"
                        placeholder="Access token"
                        class="w-full"
                      />
                    </div>

                    <div class="flex gap-2">
                      <button
                        @click="getClientCredentialsToken"
                        :disabled="isGettingToken || !oauth2.tokenUrl || !oauth2.clientId"
                        class="flex-1 py-2 px-3 bg-bg-input border border-border-default rounded text-xs font-medium text-text-secondary hover:border-accent-blue transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Refresh Token
                      </button>
                      <button
                        @click="storeTokensInEnvironment"
                        :disabled="!props.environmentId"
                        class="flex-1 py-2 px-3 bg-bg-input border border-border-default rounded text-xs font-medium text-text-secondary hover:border-accent-green hover:text-accent-green transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Store token in environment variables"
                      >
                        Store in Env
                      </button>
                      <button
                        @click="clearTokens"
                        class="flex-1 py-2 px-3 bg-bg-input border border-border-default rounded text-xs font-medium text-text-secondary hover:text-accent-red hover:border-accent-red transition-colors duration-fast"
                      >
                        Clear Token
                      </button>
                    </div>
                  </div>

                  <div v-if="!oauth2.accessToken" class="p-4 text-center text-text-muted text-sm">
                    <p class="mb-2">Click "Get Access Token" to fetch a new token directly from the token endpoint</p>
                    <p class="text-xs">No user interaction required - credentials are sent directly to the token URL</p>
                  </div>
                </div>

                <div v-if="authType === 'none'" class="p-4 text-center text-text-muted text-sm">
                  This request will be sent without authentication
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pre-Script Tab -->
        <div v-else-if="activeTab === 'preScript'" class="flex-1 flex flex-col overflow-hidden">
          <div class="p-3 border-b border-border-default bg-bg-secondary">
            <p class="text-xs text-text-muted">
              JavaScript code to run before the request. Use <code class="px-1 py-0.5 bg-bg-tertiary rounded text-accent-blue">pm.environment.set("key", "value")</code> to update environment variables.
            </p>
          </div>
          <div class="flex-1 overflow-hidden">
            <textarea
              v-model="preScript"
              class="w-full h-full p-4 bg-bg-input text-text-primary font-mono text-sm resize-none border-none focus:outline-none"
              placeholder="// Pre-request script&#10;// Example: Set a dynamic header&#10;const timestamp = new Date().toISOString();&#10;pm.request.headers['X-Timestamp'] = timestamp;&#10;console.log('Timestamp set:', timestamp);&#10;&#10;// Or use pm.console.log('Timestamp set:', timestamp);"
              spellcheck="false"
            ></textarea>
          </div>
          <div class="p-2 border-t border-border-default bg-bg-secondary flex items-center gap-2">
            <span class="text-xs text-text-muted">Available:</span>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'env-get')">pm.environment.get()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'env-set')">pm.environment.set()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'request')">pm.request</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'console')">console.log()</code>
          </div>
        </div>

        <!-- Post-Script Tab -->
        <div v-else-if="activeTab === 'postScript'" class="flex-1 flex flex-col overflow-hidden">
          <div class="p-3 border-b border-border-default bg-bg-secondary">
            <p class="text-xs text-text-muted">
              JavaScript code to run after the request. Access response via <code class="px-1 py-0.5 bg-bg-tertiary rounded text-accent-blue">pm.response</code>.
            </p>
          </div>
          <div class="flex-1 overflow-hidden">
            <textarea
              v-model="postScript"
              class="w-full h-full p-4 bg-bg-input text-text-primary font-mono text-sm resize-none border-none focus:outline-none"
              placeholder="// Post-response script&#10;// Example: Check status code and extract token&#10;if (pm.response.code == 200) {&#10;  const json = pm.response.json();&#10;  if (json.access_token) {&#10;    pm.environment.set('access_token', json.access_token);&#10;    console.log('Token saved:', json.access_token);&#10;    console.log('Response time:', pm.response.responseTime + 'ms');&#10;  }&#10;}"
              spellcheck="false"
            ></textarea>
          </div>
          <div class="p-2 border-t border-border-default bg-bg-secondary flex items-center gap-2">
            <span class="text-xs text-text-muted">Available:</span>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'response-code')">pm.response.code</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'response-json')">pm.response.json()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'response-time')">pm.response.responseTime</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'response-size')">pm.response.size</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'env-set')">pm.environment.set()</code>
          </div>
        </div>

        <!-- Mock Tab -->
        <div v-else-if="activeTab === 'mock'" class="flex-1 flex flex-col overflow-hidden">
          <MockConfiguration v-model="mockConfig" />
        </div>

        <!-- Examples Tab -->
        <div v-else-if="activeTab === 'examples'" class="flex-1 flex flex-col overflow-hidden">
          <RequestExampleManager :request-id="props.request.id" :read-only="readOnly" />
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
                    @click="openResponseSearch"
                    class="p-1.5 text-text-muted hover:text-text-secondary transition-colors duration-fast"
                    title="Search (Cmd/Ctrl+F)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </button>
                  <button 
                    @click="openSaveExampleModal"
                    class="p-1.5 text-text-muted hover:text-accent-green transition-colors duration-fast"
                    title="Save response as example"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
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
                    @keydown.enter.prevent="handleSearchInputEnter"
                    @keydown.esc.prevent="closeResponseSearch"
                  />
                  <span v-if="searchQuery" class="text-[11px] text-text-muted whitespace-nowrap">
                    {{ searchMatches.length === 0 ? '0' : activeSearchMatchIndex + 1 }} / {{ searchMatches.length }}
                  </span>
                  <button
                    :disabled="searchMatches.length === 0"
                    @click="goToPreviousSearchMatch"
                    class="p-1 text-text-muted hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Previous match (Shift+Enter)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                  </button>
                  <button
                    :disabled="searchMatches.length === 0"
                    @click="goToNextSearchMatch"
                    class="p-1 text-text-muted hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Next match (Enter)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  <button
                    v-if="searchQuery"
                    @click="searchQuery = ''"
                    class="p-1 text-text-muted hover:text-text-secondary"
                    title="Clear"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <button
                    @click="closeResponseSearch"
                    class="p-1 text-text-muted hover:text-text-secondary"
                    title="Close"
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
                  v-if="isJsonResponse() || isHtmlResponse()"
                  @click="responseViewType = 'preview'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'preview' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Preview
                </button>
                <button
                  v-if="isImageResponse()"
                  @click="responseViewType = 'imagePreview'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'imagePreview' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
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
                <button
                  v-if="scriptLogs.length > 0"
                  @click="responseViewType = 'console'"
                  class="px-3 py-2 text-xs font-medium transition-colors duration-fast whitespace-nowrap"
                  :class="responseViewType === 'console' ? 'text-text-primary border-b-2 border-accent-blue' : 'text-text-muted hover:text-text-secondary'"
                >
                  Console ({{ scriptLogs.length }})
                </button>
              </div>
            </div>

            <div v-if="response.success" ref="responseContentRef" class="flex-1 overflow-auto p-4">
              <div v-if="responseViewType === 'pretty' && isJsonResponse() && getHighlightedJson" class="space-y-1">
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
                  :node="getHighlightedJson"
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

              <div v-else-if="responseViewType === 'preview'" class="h-full flex flex-col">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">{{ getContentType().split(';')[0] }}</span>
                </div>
                <div class="flex-1 overflow-hidden rounded border border-border-default bg-bg-tertiary">
                  <iframe
                    v-if="isHtmlResponse()"
                    :srcdoc="getResponseText()"
                    class="w-full h-full border-none"
                    sandbox="allow-same-origin"
                  ></iframe>
                  <iframe
                    v-else-if="isJsonResponse()"
                    :srcdoc="getJsonPreviewHtml()"
                    class="w-full h-full border-none"
                  ></iframe>
                  <div v-else class="w-full h-full flex items-center justify-center text-text-muted text-xs">
                    Preview not available for this content type
                  </div>
                </div>
              </div>

              <div v-else-if="responseViewType === 'imagePreview' && isImageResponse()" class="h-full flex flex-col">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">{{ getContentType().split(';')[0] }}</span>
                  <span v-if="getImageData()?.size" class="text-xs text-text-muted">({{ formatBytes(getImageData()!.size) }})</span>
                </div>
                <div class="flex-1 flex items-center justify-center bg-bg-tertiary rounded border border-border-default p-4 overflow-auto">
                  <img
                    v-if="getImageData()?.src"
                    :src="getImageData()!.src"
                    alt="Response preview"
                    class="max-w-full max-h-full object-contain rounded shadow-lg"
                  />
                </div>
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

              <div v-else-if="responseViewType === 'console'" class="h-full flex flex-col">
                <div class="flex items-center gap-2 mb-3 pb-2 border-b border-border-default">
                  <span class="text-xs text-text-muted">Script Console ({{ scriptLogs.length }} logs)</span>
                  <button
                    @click="scriptLogs = []"
                    class="text-xs text-accent-blue hover:text-accent-blue/80"
                  >
                    Clear
                  </button>
                </div>
                <div class="flex-1 overflow-auto bg-bg-tertiary rounded border border-border-default p-3">
                  <div
                    v-for="(log, index) in scriptLogs"
                    :key="index"
                    class="py-1 px-2 border-b border-border-default/50 last:border-b-0 font-mono text-xs"
                    :class="{
                      'text-text-primary': log.type === 'log',
                      'text-accent-red': log.type === 'error',
                      'text-accent-yellow': log.type === 'warn'
                    }"
                  >
                    <span class="text-text-muted text-[10px] mr-2">[{{ log.phase === 'pre' ? 'PRE' : 'POST' }}]</span>
                    <span>{{ log.message }}</span>
                  </div>
                  <div v-if="scriptLogs.length === 0" class="text-text-muted text-xs italic">
                    No script logs
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

    <!-- Save Response as Example Modal -->
    <Teleport to="body">
      <div v-if="showSaveExampleModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="closeSaveExampleModal"></div>
        <div class="relative w-full max-w-lg mx-4 bg-bg-primary border border-border-default rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-border-default">
            <h3 class="text-lg font-semibold text-text-primary">Save Response as Example</h3>
            <button @click="closeSaveExampleModal" class="p-1 text-text-muted hover:text-text-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="flex-1 overflow-auto p-6 space-y-4">
            <!-- Success Message -->
            <div v-if="saveExampleSuccess" class="p-3 bg-accent-green/10 border border-accent-green/30 rounded-md">
              <div class="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-green">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span class="text-sm text-accent-green font-medium">Example saved successfully!</span>
              </div>
            </div>
            
            <!-- Error Message -->
            <div v-if="saveExampleError" class="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md">
              <p class="text-xs text-accent-red">{{ saveExampleError }}</p>
            </div>
            
            <div v-if="!saveExampleSuccess">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">Example Name *</label>
                  <input
                    v-model="saveExampleName"
                    type="text"
                    placeholder="e.g., Success Response"
                    class="w-full px-3 py-2 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                    @keyup.enter="saveResponseAsExample"
                  />
                  <p class="text-xs text-text-muted mt-1">Give this response a descriptive name</p>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-1">Status Code</label>
                  <div class="px-3 py-2 bg-bg-tertiary border border-border-default rounded-md text-text-primary text-sm">
                    <span 
                      v-if="response && 'success' in response && response.success"
                      :class="[
                        'font-mono font-bold',
                        response.status >= 200 && response.status < 300 ? 'text-accent-green' :
                        response.status >= 400 && response.status < 500 ? 'text-accent-orange' :
                        response.status >= 500 ? 'text-accent-red' : 'text-text-primary'
                      ]"
                    >
                      {{ response.status }} {{ response.statusText }}
                    </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <input
                    v-model="saveExampleIsDefault"
                    type="checkbox"
                    id="saveExampleIsDefault"
                    class="w-4 h-4 rounded border-border-default bg-bg-input text-accent-blue focus:ring-accent-blue"
                  />
                  <label for="saveExampleIsDefault" class="text-sm text-text-primary">Set as default example for this status code</label>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-text-primary mb-2">Preview</label>
                  <div class="bg-bg-tertiary rounded-md border border-border-default p-3">
                    <pre class="text-xs font-mono text-text-secondary overflow-x-auto max-h-48">{{ getResponsePreview() }}</pre>
                  </div>
                  <p class="text-xs text-text-muted mt-1">This is what will be saved as the example</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default">
            <button
              @click="closeSaveExampleModal"
              class="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              :disabled="saveExampleLoading"
            >
              Cancel
            </button>
            <button
              v-if="!saveExampleSuccess"
              @click="saveResponseAsExample"
              :disabled="saveExampleLoading || !saveExampleName.trim()"
              class="px-4 py-2 text-sm font-medium text-white bg-accent-blue rounded-md hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <svg v-if="saveExampleLoading" class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {{ saveExampleLoading ? 'Saving...' : 'Save Example' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
kbd {
  user-select: none;
}

:deep(.response-search-highlight) {
  transition: background-color 120ms ease;
}

:deep(.response-search-highlight.response-search-highlight-active) {
  background-color: rgba(59, 130, 246, 0.45);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.75);
}
</style>