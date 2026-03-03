<script setup lang="ts">
import { computed, nextTick, watch } from 'vue';
import JsonNode from './JsonNode.vue';
import VariableInput from './VariableInput.vue';
import VariableTextarea from './VariableTextarea.vue';
import RequestExampleManager from './RequestExampleManager.vue';
import MockConfiguration from './MockConfiguration.vue';

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
  mockConfig?: import('../../server/db/schema/savedRequest').MockConfig | null;
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
  readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false
});

const emit = defineEmits<{
  saveRequest: [request: HttpRequest];
  saveAsRequest: [request: HttpRequest];
  unsavedChanges: [request: HttpRequest, hasUnsavedChanges: boolean];
}>();

type TabType = 'params' | 'headers' | 'body' | 'auth' | 'preScript' | 'postScript' | 'mock' | 'examples' | 'response';
type BodyFormat = 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary';
type ResponseViewType = 'pretty' | 'preview' | 'raw' | 'headers' | 'cookies' | 'imagePreview' | 'console';

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

// Mock configuration state
const mockConfig = ref<import('../../server/db/schema/savedRequest').MockConfig | null>(null);

// Script state
const preScript = ref('');
const postScript = ref('');
const scriptLogs = ref<Array<{ phase: 'pre' | 'post'; type: 'log' | 'error' | 'warn'; message: string; timestamp: number }>>([]);
const activeScriptTab = ref<'console' | 'preScript' | 'postScript'>('console');

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
    postScript: postScript.value
  };
};

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
  if (snapshot === lastLoadedRequestSnapshot.value && lastLoadedRequestId.value === request.id) {
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

  // Clear response and script logs when switching requests
  response.value = null;
  scriptLogs.value = [];
  
  // Mark as loaded with snapshot
  lastLoadedRequestId.value = request.id;
  lastLoadedRequestSnapshot.value = snapshot;
};

// Watch for request ID changes - this ensures proper triggering on every request switch
watch(() => props.request.id, () => {
  loadRequestData(props.request);
}, { immediate: true });

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

  // Use lastSavedState if available (after a save), otherwise use props.request
  const compareState = lastSavedState.value || {
    method: props.request.method,
    url: props.request.url,
    headers: props.request.headers,
    body: props.request.body,
    auth: props.request.auth,
    mockConfig: props.request.mockConfig,
    preScript: props.request.preScript,
    postScript: props.request.postScript
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

  return urlChanged || methodChanged || headersChanged || bodyChanged || authChanged || mockConfigChanged || preScriptChanged || postScriptChanged;
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

const insertSnippet = (type: 'pre' | 'post', snippet: string) => {
  const snippets: Record<string, string> = {
    'env-get': `const value = pm.environment.get("key");`,
    'env-set': `pm.environment.set("key", "value");`,
    'request': `// Access request properties\npm.request.headers["X-Custom"] = "value";`,
    'response-json': `const json = pm.response.json();`,
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
  emit('unsavedChanges', props.request, newValue);
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

// Expose current request state for CodeExamples component
defineExpose({
  form,
  headers,
  queryParams,
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
              placeholder="// Pre-request script&#10;// Example: Set a dynamic header&#10;const timestamp = new Date().toISOString();&#10;pm.request.headers['X-Timestamp'] = timestamp;&#10;pm.console.log('Timestamp set:', timestamp);"
              spellcheck="false"
            ></textarea>
          </div>
          <div class="p-2 border-t border-border-default bg-bg-secondary flex items-center gap-2">
            <span class="text-xs text-text-muted">Available:</span>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'env-get')">pm.environment.get()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'env-set')">pm.environment.set()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('pre', 'request')">pm.request</code>
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
              placeholder="// Post-response script&#10;// Example: Extract token from response&#10;const json = pm.response.json();&#10;if (json.access_token) {&#10;  pm.environment.set('access_token', json.access_token);&#10;  pm.console.log('Token saved to environment');&#10;}"
              spellcheck="false"
            ></textarea>
          </div>
          <div class="p-2 border-t border-border-default bg-bg-secondary flex items-center gap-2">
            <span class="text-xs text-text-muted">Available:</span>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'response-json')">pm.response.json()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'env-set')">pm.environment.set()</code>
            <code class="text-xs px-1.5 py-0.5 bg-bg-tertiary rounded text-accent-blue cursor-pointer hover:bg-bg-hover" @click="insertSnippet('post', 'status')">pm.response.status</code>
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
  </div>
</template>

<style scoped>
kbd {
  user-select: none;
}
</style>