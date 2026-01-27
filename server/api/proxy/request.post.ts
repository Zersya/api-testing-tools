/**
 * HTTP Proxy Endpoint
 * POST /api/proxy/request
 * 
 * Proxies HTTP requests to target URLs to avoid CORS issues.
 * Supports all HTTP methods, custom headers, and various body types.
 * Auto-logs requests to history when workspaceId is provided.
 * Supports environment variable substitution with {{VAR_NAME}} syntax.
 */

import { db } from '../../db';
import { requestHistories } from '../../db/schema';
import { environments, environmentVariables } from '../../db/schema';
import type { HttpMethod, RequestData, ResponseData } from '../../db/schema/requestHistory';
import { eq, inArray } from 'drizzle-orm';

interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface ProxyRequestBody {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  workspaceId?: string;
  environmentId?: string;
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
  variableWarnings?: string[];
  resolvedValues?: {
    url?: string;
    headers?: Record<string, string>;
    body?: any;
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
  variableWarnings?: string[];
}

const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;
const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 120000;

export default defineEventHandler(async (event): Promise<ProxyResponse | ProxyErrorResponse> => {
  const startTime = new Date();
  const variableWarnings: string[] = [];
  
  try {
    const body = await readBody<ProxyRequestBody>(event);

    if (!body.url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: url'
      });
    }

    if (!body.method) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: method'
      });
    }

    const method = body.method.toUpperCase() as typeof VALID_METHODS[number];
    if (!VALID_METHODS.includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid HTTP method. Supported methods: ${VALID_METHODS.join(', ')}`
      });
    }

    const timeout = Math.min(
      Math.max(body.timeout || DEFAULT_TIMEOUT, 1000),
      MAX_TIMEOUT
    );

    const requestHeaders: Record<string, string> = {};
    const headersToExclude = [
      'host',
      'connection',
      'content-length',
      'transfer-encoding',
      'upgrade',
      'http2-settings'
    ];

    if (body.headers) {
      for (const [key, value] of Object.entries(body.headers)) {
        if (!headersToExclude.includes(key.toLowerCase())) {
          requestHeaders[key] = value;
        }
      }
    }

    let resolvedUrl = body.url;
    let resolvedHeaders = { ...requestHeaders };
    let resolvedBody: any = body.body;
    let resolvedValues: ProxyResponse['resolvedValues'] | undefined;
    let environmentLoadFailed = false;

    if (body.environmentId) {
      try {
        const environment = db
          .select()
          .from(environments)
          .where(eq(environments.id, body.environmentId))
          .get();

        if (environment) {
          const environmentVariablesList = db
            .select()
            .from(environmentVariables)
            .where(eq(environmentVariables.environmentId, body.environmentId))
            .all();

          if (environmentVariablesList && environmentVariablesList.length > 0) {
            const variables: Record<string, string> = {};
            environmentVariablesList.forEach((v: EnvironmentVariable) => {
              variables[v.key] = v.value;
            });

            const substituteWithLimit = (input: string, maxIterations: number = 10): string => {
              let result = input;
              let iterations = 0;
              const variablePattern = /\{\{([^{}]+)\}\}/g;

              let match;
              while ((match = variablePattern.exec(result)) !== null && iterations < maxIterations) {
                const trimmedName = match[1].trim();
                if (variables.hasOwnProperty(trimmedName)) {
                  result = result.replace(match[0], variables[trimmedName]);
                  variablePattern.lastIndex = 0;
                  iterations++;
                }
              }

              if (iterations >= maxIterations) {
                variableWarnings.push(`Variable substitution limit reached (possible circular reference)`);
              }

              return result;
            };

            const originalUrl = body.url;
            resolvedUrl = substituteWithLimit(body.url);
            if (resolvedUrl !== originalUrl) {
              resolvedValues = { ...resolvedValues, url: resolvedUrl };
            }

            for (const [key, value] of Object.entries(resolvedHeaders)) {
              if (typeof value === 'string' && value.includes('{{')) {
                resolvedHeaders[key] = substituteWithLimit(value);
              }
            }

            if (resolvedBody && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
              if (typeof resolvedBody === 'string') {
                resolvedBody = substituteWithLimit(resolvedBody);
              } else {
                const bodyStr = JSON.stringify(resolvedBody);
                const substitutedBody = substituteWithLimit(bodyStr);
                try {
                  resolvedBody = JSON.parse(substitutedBody);
                } catch {
                  resolvedBody = substitutedBody;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch environment variables:', error);
        variableWarnings.push('Failed to load environment variables - using raw values');
        environmentLoadFailed = true;
      }
    }

    const unresolvedPattern = /\{\{([^{}]+)\}\}/g;
    let unresolvedMatch;
    while ((unresolvedMatch = unresolvedPattern.exec(resolvedUrl)) !== null) {
      variableWarnings.push(`Undefined variable: {{${unresolvedMatch[1].trim()}}}`);
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(resolvedUrl);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL format'
      });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: resolvedHeaders,
      signal: AbortSignal.timeout(timeout)
    };

    if (body.body && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
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

    const response = await fetch(targetUrl.toString(), fetchOptions);
    const endTime = new Date();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseBody: any;
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else if (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('application/javascript')) {
        responseBody = await response.text();
      } else if (contentType.includes('application/octet-stream') || contentType.includes('image/') || contentType.includes('audio/') || contentType.includes('video/')) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        responseBody = {
          _binary: true,
          encoding: 'base64',
          data: base64,
          size: arrayBuffer.byteLength
        };
      } else {
        try {
          responseBody = await response.text();
        } catch {
          responseBody = null;
        }
      }
    } catch (parseError) {
      responseBody = null;
    }

    const proxyResponse: ProxyResponse = {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      timing: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime()
      },
      variableWarnings: variableWarnings.length > 0 ? variableWarnings : undefined,
      resolvedValues: resolvedValues && Object.keys(resolvedValues).length > 0 ? resolvedValues : undefined
    };

    if (body.workspaceId) {
      try {
        const requestData: RequestData = {
          headers: body.headers,
          body: body.body,
          queryParams: Object.fromEntries(targetUrl.searchParams.entries())
        };

        const responseData: ResponseData = {
          headers: responseHeaders,
          body: responseBody
        };

        db.insert(requestHistories).values({
          workspaceId: body.workspaceId,
          method: method as HttpMethod,
          url: body.url,
          requestData,
          responseData,
          statusCode: response.status,
          responseTimeMs: endTime.getTime() - startTime.getTime(),
          timestamp: startTime
        }).run();
      } catch (logError) {
        console.error('Failed to log request to history:', logError);
      }
    }

    return proxyResponse;

  } catch (error: any) {
    const endTime = new Date();

    if (error.statusCode) {
      throw error;
    }

    if (error.name === 'TimeoutError' || error.code === 'ABORT_ERR' || error.message?.includes('timeout')) {
      return {
        success: false,
        error: {
          message: 'Request timed out',
          code: 'TIMEOUT',
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        },
        variableWarnings: variableWarnings.length > 0 ? variableWarnings : undefined
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      return {
        success: false,
        error: {
          message: 'Network error: Unable to connect to target server',
          code: error.code,
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        },
        variableWarnings: variableWarnings.length > 0 ? variableWarnings : undefined
      };
    }

    if (error.code === 'EAI_AGAIN' || error.code === 'ENOENT') {
      return {
        success: false,
        error: {
          message: 'DNS resolution failed',
          code: 'DNS_ERROR',
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        },
        variableWarnings: variableWarnings.length > 0 ? variableWarnings : undefined
      };
    }

    if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED' || error.message?.includes('SSL') || error.message?.includes('certificate')) {
      return {
        success: false,
        error: {
          message: 'SSL/TLS certificate error',
          code: 'SSL_ERROR',
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        },
        variableWarnings: variableWarnings.length > 0 ? variableWarnings : undefined
      };
    }

    return {
      success: false,
      error: {
        message: 'Request failed',
        code: error.code || 'UNKNOWN_ERROR',
        cause: error.message
      },
      timing: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime()
      },
      variableWarnings: variableWarnings.length > 0 ? variableWarnings : undefined
    };
  }
});
