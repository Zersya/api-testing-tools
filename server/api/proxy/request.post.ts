/**
 * HTTP Proxy Endpoint
 * POST /api/proxy/request
 * 
 * Proxies HTTP requests to target URLs to avoid CORS issues.
 * Supports all HTTP methods, custom headers, and various body types.
 * Auto-logs requests to history when workspaceId is provided.
 */

import { db } from '../../db';
import { requestHistories } from '../../db/schema';
import type { HttpMethod, RequestData, ResponseData } from '../../db/schema/requestHistory';

interface ProxyRequestBody {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  workspaceId?: string; // Optional: If provided, request will be logged to history
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

const VALID_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_TIMEOUT = 120000; // 2 minutes

export default defineEventHandler(async (event): Promise<ProxyResponse | ProxyErrorResponse> => {
  const startTime = new Date();
  
  try {
    const body = await readBody<ProxyRequestBody>(event);

    // Validate required fields
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

    // Validate URL format
    let targetUrl: URL;
    try {
      targetUrl = new URL(body.url);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL format'
      });
    }

    // Validate HTTP method
    const method = body.method.toUpperCase() as typeof VALID_METHODS[number];
    if (!VALID_METHODS.includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid HTTP method. Supported methods: ${VALID_METHODS.join(', ')}`
      });
    }

    // Configure timeout (default 30s, max 2 minutes)
    const timeout = Math.min(
      Math.max(body.timeout || DEFAULT_TIMEOUT, 1000),
      MAX_TIMEOUT
    );

    // Prepare headers - filter out problematic headers
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

    // Prepare request options
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout)
    };

    // Add body for methods that support it
    if (body.body && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (typeof body.body === 'string') {
        fetchOptions.body = body.body;
      } else if (body.body instanceof FormData) {
        fetchOptions.body = body.body;
      } else {
        // Assume JSON
        fetchOptions.body = JSON.stringify(body.body);
        if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    // Make the request
    const response = await fetch(targetUrl.toString(), fetchOptions);
    const endTime = new Date();

    // Extract response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body based on content type
    let responseBody: any;
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else if (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('application/javascript')) {
        responseBody = await response.text();
      } else if (contentType.includes('application/octet-stream') || contentType.includes('image/') || contentType.includes('audio/') || contentType.includes('video/')) {
        // For binary data, return base64 encoded
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        responseBody = {
          _binary: true,
          encoding: 'base64',
          data: base64,
          size: arrayBuffer.byteLength
        };
      } else {
        // Try to parse as text first, fallback to raw
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
      }
    };

    // Auto-log to history if workspaceId is provided
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
        // Log error but don't fail the request
        console.error('Failed to log request to history:', logError);
      }
    }

    return proxyResponse;

  } catch (error: any) {
    const endTime = new Date();

    // Handle H3 errors (validation errors)
    if (error.statusCode) {
      throw error;
    }

    // Handle timeout errors
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
        }
      };
    }

    // Handle network errors
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
        }
      };
    }

    // Handle DNS errors
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
        }
      };
    }

    // Handle SSL/TLS errors
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
        }
      };
    }

    // Generic error fallback
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
      }
    };
  }
});
