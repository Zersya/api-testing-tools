/**
 * Client Request Composable
 *
 * Handles HTTP requests to localhost and private network URLs directly from the browser.
 * This allows testing local APIs when the app is deployed to a remote server.
 *
 * Features:
 * - Detects local URLs (localhost, 127.0.0.1, private IPs)
 * - Fetches environment variables and applies substitution
 * - Executes pre/post scripts via API
 * - Handles binary responses
 * - Provides CORS guidance when blocked
 */

import type { ProxyResponse, ProxyErrorResponse } from '~/components/RequestBuilder.vue';
import { useApiClient } from '~~/composables/useApiFetch';

// Magic variable generators (client-side subset of server implementation)
const MAGIC_GENERATORS: Record<string, () => string> = {
  // Common
  $guid: () => crypto.randomUUID(),
  $timestamp: () => String(Math.floor(Date.now() / 1000)),
  $isoTimestamp: () => new Date().toISOString(),
  $randomUUID: () => crypto.randomUUID(),

  // Text and numbers
  $randomAlphaNumeric: () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)],
  $randomBoolean: () => String(Math.random() > 0.5),
  $randomInt: () => String(Math.floor(Math.random() * 1000)),

  // Dates
  $randomDateFuture: () => new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toString(),
  $randomDatePast: () => new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toString(),
  $randomDateRecent: () => new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toString(),
  $randomWeekday: () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()],
  $randomMonth: () => new Date().toLocaleString('default', { month: 'long' }),
};

interface ScriptLogEntry {
  phase: 'pre' | 'post';
  type: 'log' | 'error' | 'warn';
  message: string;
  timestamp: number;
}

interface ScriptExecutionResult {
  success: boolean;
  logs: ScriptLogEntry[];
  errors: string[];
  modifiedContext?: {
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  };
  environmentChanges?: Array<{
    key: string;
    value: string;
    action: 'set' | 'unset';
  }>;
}

interface ClientRequestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  workspaceId?: string;
  environmentId?: string;
  savedRequestId?: string;
  pathVariables?: Array<{ key: string; value: string }>;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30000;

/**
 * Check if a URL is a local/private network URL
 * Includes: localhost, 127.0.0.1, private IP ranges, .local domains
 * Also handles URLs with template variables like {{URL}} that may resolve to localhost
 */
export function isLocalUrl(url: string): boolean {
  // Check for template variables at the start of the URL
  // These will be resolved later - if they start with a template variable,
  // we need to check what the template variable value typically resolves to
  const templateVarPattern = /^(\{\{|%7B%7B)([^{}%]+)(\}\}|%7D%7D)/;
  const templateMatch = url.match(templateVarPattern);

  if (templateMatch) {
    // URL starts with a template variable like {{URL}}/api
    // We need to check if the base variable could be localhost
    // For now, assume URLs with template vars that look like base URLs might be local
    // The actual resolution will happen in executeClientRequest after fetching env vars
    // But we can do a quick check: if the URL after the template var looks like a path,
    // it's likely a base URL that should be checked after substitution

    // Extract the path part after the template variable
    const afterTemplate = url.substring(templateMatch[0].length);

    // If what follows looks like a path (starts with /), this is likely a base URL template
    // In this case, we should let it go through client-side request handling
    // because the template variable value itself will be checked after substitution
    if (afterTemplate.startsWith('/') || afterTemplate === '' || afterTemplate.startsWith('?')) {
      // This looks like {{URL}}/path or {{URL}}?query - likely needs client-side handling
      // The actual localhost check will happen after variable substitution
      return true; // Tentatively treat as local to trigger client-side handling
    }
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Localhost variants
    if (hostname === 'localhost') return true;
    if (hostname === '127.0.0.1') return true;
    if (hostname === '::1') return true;
    if (hostname === '[::1]') return true;

    // Local domains
    if (hostname.endsWith('.local') || hostname.endsWith('.localhost')) return true;

    // IPv4 private ranges
    // 10.0.0.0/8
    if (hostname.startsWith('10.')) return true;

    // 172.16.0.0/12
    if (hostname.startsWith('172.')) {
      const secondOctet = parseInt(hostname.split('.')[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }

    // 192.168.0.0/16
    if (hostname.startsWith('192.168.')) return true;

    // 127.0.0.0/8 (loopback range)
    if (hostname.startsWith('127.')) return true;

    // IPv6 private ranges
    // fc00::/7 (Unique Local Addresses)
    if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true;

    // fe80::/10 (Link-local addresses)
    if (hostname.startsWith('fe8') || hostname.startsWith('fe9') ||
        hostname.startsWith('fea') || hostname.startsWith('feb')) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Get magic variable value (client-side implementation)
 */
function getMagicVariableValue(name: string): string | null {
  const trimmed = name.trim();
  const generator = MAGIC_GENERATORS[trimmed];
  if (!generator) return null;
  try {
    return generator();
  } catch {
    return null;
  }
}

/**
 * Substitute {{variable}} syntax in a string
 */
export function substituteVariables(
  input: string,
  variables: Record<string, string>,
  maxIterations: number = 10
): string {
  let result = input;
  let iterations = 0;

  // Match both {{...}} and URL-encoded %7B%7B...%7D%7D
  const variablePattern = /(\{\{|%7B%7B)([^{}%]+)(\}\}|%7D%7D)/g;

  let match;
  while ((match = variablePattern.exec(result)) !== null && iterations < maxIterations) {
    const trimmedName = match[2].trim();
    let replacement: string | undefined = variables[trimmedName];

    // Try magic variable if not in environment
    if (replacement === undefined) {
      const magicValue = getMagicVariableValue(trimmedName);
      if (magicValue !== null) replacement = magicValue;
    }

    if (replacement !== undefined) {
      result = result.replace(match[0], replacement);
      variablePattern.lastIndex = 0;
      iterations++;
    }
  }

  return result;
}

/**
 * Generate CORS error guidance message with framework-specific examples
 */
function generateCorsGuidance(url: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '*';

  return `CORS Policy Blocked

Your local API at ${url} is blocking cross-origin requests from ${origin}.

To fix this, add CORS headers to your API:

Express.js:
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

Flask:
  from flask_cors import CORS
  CORS(app)

Django:
  # Add 'corsheaders' to INSTALLED_APPS
  # Add 'corsheaders.middleware.CorsMiddleware' to MIDDLEWARE
  CORS_ALLOW_ALL_ORIGINS = True

Go:
  handler := cors.Default().Handler(router)
  http.ListenAndServe(":3000", handler)

Spring Boot:
  @CrossOrigin(origins = "*")
  @RestController
  public class MyController { }

For development, you can also use a CORS browser extension like:
  - Allow CORS: Access-Control-Allow-Origin (Chrome/Firefox)`;
}

/**
 * Convert binary response to ProxyResponse format
 */
async function handleBinaryResponse(response: Response): Promise<any> {
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  // Convert to base64 for JSON serialization
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    _binary: true,
    encoding: 'base64',
    data: base64,
    size: arrayBuffer.byteLength,
    mimeType: blob.type || 'application/octet-stream'
  };
}

/**
 * Parse response based on content type
 */
async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (contentType.includes('text/') ||
        contentType.includes('application/xml') ||
        contentType.includes('application/javascript')) {
      return await response.text();
    }

    if (contentType.includes('image/') ||
        contentType.includes('application/octet-stream') ||
        contentType.includes('audio/') ||
        contentType.includes('video/') ||
        contentType.includes('application/pdf')) {
      return await handleBinaryResponse(response);
    }

    // Default to text
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Execute a pre-request script via API
 */
async function executePreScript(
  code: string,
  context: { url: string; method: string; headers: Record<string, string>; body: any },
  environmentId: string
): Promise<ScriptExecutionResult> {
  try {
    const api = useApiClient();
    const result = await api.post<ScriptExecutionResult>('/api/scripts/execute', {
      body: {
        scriptType: 'pre',
        code,
        context,
        environmentId
      }
    });
    return result;
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      errors: [error.message || 'Failed to execute pre-request script']
    };
  }
}

/**
 * Execute a post-response script via API
 */
async function executePostScript(
  code: string,
  context: { url: string; method: string; headers: Record<string, string>; body: any },
  response: { status: number; statusText: string; headers: Record<string, string>; body: any },
  environmentId: string,
  responseTimeMs: number,
  responseSize: number
): Promise<ScriptExecutionResult> {
  try {
    const api = useApiClient();
    const result = await api.post<ScriptExecutionResult>('/api/scripts/execute', {
      body: {
        scriptType: 'post',
        code,
        context,
        response,
        environmentId,
        responseTimeMs,
        responseSize
      }
    });
    return result;
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      errors: [error.message || 'Failed to execute post-response script']
    };
  }
}

/**
 * Fetch saved request (for scripts)
 */
async function fetchSavedRequest(savedRequestId: string): Promise<{ preScript?: string; postScript?: string } | null> {
  try {
    const api = useApiClient();
    const result = await api.get<{ id: string; preScript: string | null; postScript: string | null }>(`/api/admin/requests/${savedRequestId}`);
    return {
      preScript: result.preScript || undefined,
      postScript: result.postScript || undefined
    };
  } catch {
    return null;
  }
}

/**
 * Log request to history
 */
async function logToHistory(
  data: {
    workspaceId: string;
    method: string;
    url: string;
    requestData: { headers: Record<string, string>; body: any; queryParams: Record<string, string> };
    responseData: { headers: Record<string, string>; body: any };
    statusCode: number;
    responseTimeMs: number;
  }
): Promise<void> {
  try {
    const api = useApiClient();
    await api.post('/api/history/log', {
      body: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[useClientRequest] Failed to log to history:', error);
  }
}

/**
 * Execute a client-side HTTP request
 * Handles localhost and private network URLs directly in the browser
 */
export async function executeClientRequest(
  options: ClientRequestOptions
): Promise<ProxyResponse | ProxyErrorResponse> {
  const startTime = Date.now();
  const scriptLogs: ScriptLogEntry[] = [];
  const scriptErrors: string[] = [];

  try {
    const {
      url,
      method,
      headers = {},
      body,
      workspaceId,
      environmentId,
      savedRequestId,
      pathVariables,
      timeout = DEFAULT_TIMEOUT
    } = options;

    // Validate URL
    if (!url) {
      return createErrorResponse(startTime, 'Missing required field: url', 'MISSING_URL');
    }

    // Apply path variable substitution
    let resolvedUrl = url;
    if (pathVariables && pathVariables.length > 0) {
      pathVariables.forEach((variable) => {
        if (variable.key && variable.value !== undefined) {
          const pattern = new RegExp(`(:${variable.key})|(\\{${variable.key}\\})`, 'g');
          resolvedUrl = resolvedUrl.replace(pattern, variable.value);
        }
      });
    }

    // Fetch environment variables if environmentId provided
    let variables: Record<string, string> = {};
    let resolvedHeaders: Record<string, string> = { ...headers };
    let resolvedBody: any = body;

    if (environmentId) {
      try {
        const api = useApiClient();
        const envVars = await api.get<Array<{ key: string; value: string }>>(`/api/admin/environments/${environmentId}/variables`);
        variables = envVars.reduce((acc, v) => {
          acc[v.key] = v.value;
          return acc;
        }, {} as Record<string, string>);

        // Apply variable substitution
        resolvedUrl = substituteVariables(resolvedUrl, variables);

        // Substitute in headers
        for (const [key, value] of Object.entries(resolvedHeaders)) {
          if (typeof value === 'string') {
            resolvedHeaders[key] = substituteVariables(value, variables);
          }
        }

        // Substitute in body
        if (resolvedBody && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          if (typeof resolvedBody === 'string') {
            resolvedBody = substituteVariables(resolvedBody, variables);
          } else {
            const bodyStr = JSON.stringify(resolvedBody);
            const substitutedBody = substituteVariables(bodyStr, variables);
            try {
              resolvedBody = JSON.parse(substitutedBody);
            } catch {
              resolvedBody = substitutedBody;
            }
          }
        }
      } catch (error) {
        console.warn('[useClientRequest] Failed to fetch environment variables:', error);
      }
    }

    // Check for unresolved variables
    const unresolvedPattern = /(\{\{|%7B%7B)([^{}%]+)(\}\}|%7D%7D)/g;
    let unresolvedMatch;
    const unresolvedVariables: string[] = [];
    const unresolvedCheckUrl = resolvedUrl;
    while ((unresolvedMatch = unresolvedPattern.exec(unresolvedCheckUrl)) !== null) {
      unresolvedVariables.push(unresolvedMatch[2].trim());
    }

    if (unresolvedVariables.length > 0) {
      return createErrorResponse(
        startTime,
        `Undefined environment variable(s): ${unresolvedVariables.map(v => `{{${v}}}`).join(', ')}. Please check that the variable exists in the selected environment.`,
        'UNDEFINED_VARIABLES'
      );
    }

    // Load and execute pre-script if available
    if (savedRequestId && environmentId) {
      try {
        const savedRequest = await fetchSavedRequest(savedRequestId);

        if (savedRequest?.preScript) {
          const preResult = await executePreScript(
            savedRequest.preScript,
            {
              url: resolvedUrl,
              method,
              headers: { ...resolvedHeaders },
              body: resolvedBody
            },
            environmentId
          );

          scriptLogs.push(...preResult.logs);
          scriptErrors.push(...preResult.errors);

          if (preResult.success && preResult.modifiedContext) {
            if (preResult.modifiedContext.url) {
              resolvedUrl = preResult.modifiedContext.url;
            }
            if (preResult.modifiedContext.headers) {
              resolvedHeaders = preResult.modifiedContext.headers;
            }
            if (preResult.modifiedContext.body !== undefined) {
              resolvedBody = preResult.modifiedContext.body;
            }
          }
        }
      } catch (error) {
        console.error('[useClientRequest] Failed to execute pre-script:', error);
        scriptErrors.push('Failed to execute pre-request script');
      }
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: resolvedHeaders,
      signal: AbortSignal.timeout(timeout)
    };

    // Add body for non-GET/HEAD/OPTIONS methods
    if (resolvedBody && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (typeof resolvedBody === 'string') {
        fetchOptions.body = resolvedBody;
      } else if (resolvedBody instanceof FormData) {
        fetchOptions.body = resolvedBody;
      } else {
        fetchOptions.body = JSON.stringify(resolvedBody);
        if (!resolvedHeaders['Content-Type'] && !resolvedHeaders['content-type']) {
          resolvedHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    // Make the actual request
    let response: Response;
    try {
      response = await fetch(resolvedUrl, fetchOptions);
    } catch (fetchError: any) {
      const endTime = Date.now();

      // Detect CORS errors
      if (fetchError.message?.includes('Failed to fetch') ||
          fetchError.name === 'TypeError') {
        // This is likely a CORS error
        return {
          success: false,
          error: {
            message: 'CORS Policy Blocked',
            code: 'CORS_ERROR',
            cause: generateCorsGuidance(resolvedUrl)
          },
          timing: {
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            durationMs: endTime - startTime
          },
          scriptLogs: scriptLogs.length > 0 ? scriptLogs : undefined,
          scriptErrors: scriptErrors.length > 0 ? scriptErrors : undefined
        };
      }

      // Timeout error
      if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
        return createErrorResponse(startTime, 'Request timed out', 'TIMEOUT', fetchError.message);
      }

      throw fetchError;
    }

    const endTime = Date.now();

    // Parse response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body
    const responseBody = await parseResponse(response);

    // Calculate response size
    let responseSize = 0;
    if (responseBody) {
      if (typeof responseBody === 'string') {
        responseSize = new Blob([responseBody]).size;
      } else if (typeof responseBody === 'object') {
        responseSize = new Blob([JSON.stringify(responseBody)]).size;
      }
    }

    // Execute post-script if available
    if (savedRequestId && environmentId) {
      try {
        const savedRequest = await fetchSavedRequest(savedRequestId);

        if (savedRequest?.postScript) {
          const postResult = await executePostScript(
            savedRequest.postScript,
            {
              url: resolvedUrl,
              method,
              headers: { ...resolvedHeaders },
              body: resolvedBody
            },
            {
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: responseBody
            },
            environmentId,
            endTime - startTime,
            responseSize
          );

          scriptLogs.push(...postResult.logs);
          scriptErrors.push(...postResult.errors);
        }
      } catch (error) {
        console.error('[useClientRequest] Failed to execute post-script:', error);
        scriptErrors.push('Failed to execute post-response script');
      }
    }

    // Build result
    const result: ProxyResponse = {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      timing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime
      },
      scriptLogs: scriptLogs.length > 0 ? scriptLogs : undefined,
      scriptErrors: scriptErrors.length > 0 ? scriptErrors : undefined
    };

    // Log to history
    if (workspaceId) {
      try {
        const urlObj = new URL(resolvedUrl);
        const queryParams = Object.fromEntries(urlObj.searchParams.entries());

        await logToHistory({
          workspaceId,
          method,
          url: url, // Original URL (not resolved)
          requestData: {
            headers,
            body,
            queryParams
          },
          responseData: {
            headers: responseHeaders,
            body: responseBody
          },
          statusCode: response.status,
          responseTimeMs: endTime - startTime
        });
      } catch (error) {
        console.error('[useClientRequest] Failed to log to history:', error);
      }
    }

    return result;

  } catch (error: any) {
    const endTime = Date.now();

    return {
      success: false,
      error: {
        message: error.message || 'Request failed',
        code: error.code || 'CLIENT_REQUEST_ERROR',
        cause: error.stack
      },
      timing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime
      },
      scriptLogs: scriptLogs.length > 0 ? scriptLogs : undefined,
      scriptErrors: scriptErrors.length > 0 ? scriptErrors : undefined
    };
  }
}

/**
 * Create a standardized error response
 */
function createErrorResponse(
  startTime: number,
  message: string,
  code: string,
  cause?: string
): ProxyErrorResponse {
  const endTime = Date.now();

  return {
    success: false,
    error: {
      message,
      code,
      cause
    },
    timing: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMs: endTime - startTime
    }
  };
}

/**
 * Composable for client-side requests
 */
export function useClientRequest() {
  return {
    isLocalUrl,
    executeClientRequest,
    substituteVariables
  };
}

export default useClientRequest;
