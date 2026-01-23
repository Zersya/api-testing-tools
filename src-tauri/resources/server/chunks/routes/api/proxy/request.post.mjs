import { d as defineEventHandler, r as readBody, c as createError, b as db, z as requestHistories } from '../../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'drizzle-orm/better-sqlite3';
import 'better-sqlite3';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import 'node:url';
import 'jsonwebtoken';

const VALID_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
const DEFAULT_TIMEOUT = 3e4;
const MAX_TIMEOUT = 12e4;
const request_post = defineEventHandler(async (event) => {
  var _a, _b, _c;
  const startTime = /* @__PURE__ */ new Date();
  try {
    const body = await readBody(event);
    if (!body.url) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required field: url"
      });
    }
    if (!body.method) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing required field: method"
      });
    }
    let targetUrl;
    try {
      targetUrl = new URL(body.url);
    } catch (e) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid URL format"
      });
    }
    const method = body.method.toUpperCase();
    if (!VALID_METHODS.includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid HTTP method. Supported methods: ${VALID_METHODS.join(", ")}`
      });
    }
    const timeout = Math.min(
      Math.max(body.timeout || DEFAULT_TIMEOUT, 1e3),
      MAX_TIMEOUT
    );
    const requestHeaders = {};
    const headersToExclude = [
      "host",
      "connection",
      "content-length",
      "transfer-encoding",
      "upgrade",
      "http2-settings"
    ];
    if (body.headers) {
      for (const [key, value] of Object.entries(body.headers)) {
        if (!headersToExclude.includes(key.toLowerCase())) {
          requestHeaders[key] = value;
        }
      }
    }
    const fetchOptions = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout)
    };
    if (body.body && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      if (typeof body.body === "string") {
        fetchOptions.body = body.body;
      } else if (body.body instanceof FormData) {
        fetchOptions.body = body.body;
      } else {
        fetchOptions.body = JSON.stringify(body.body);
        if (!requestHeaders["Content-Type"] && !requestHeaders["content-type"]) {
          requestHeaders["Content-Type"] = "application/json";
        }
      }
    }
    const response = await fetch(targetUrl.toString(), fetchOptions);
    const endTime = /* @__PURE__ */ new Date();
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    let responseBody;
    const contentType = response.headers.get("content-type") || "";
    try {
      if (contentType.includes("application/json")) {
        responseBody = await response.json();
      } else if (contentType.includes("text/") || contentType.includes("application/xml") || contentType.includes("application/javascript")) {
        responseBody = await response.text();
      } else if (contentType.includes("application/octet-stream") || contentType.includes("image/") || contentType.includes("audio/") || contentType.includes("video/")) {
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        responseBody = {
          _binary: true,
          encoding: "base64",
          data: base64,
          size: arrayBuffer.byteLength
        };
      } else {
        try {
          responseBody = await response.text();
        } catch (e) {
          responseBody = null;
        }
      }
    } catch (parseError) {
      responseBody = null;
    }
    const proxyResponse = {
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
    if (body.workspaceId) {
      try {
        const requestData = {
          headers: body.headers,
          body: body.body,
          queryParams: Object.fromEntries(targetUrl.searchParams.entries())
        };
        const responseData = {
          headers: responseHeaders,
          body: responseBody
        };
        db.insert(requestHistories).values({
          workspaceId: body.workspaceId,
          method,
          url: body.url,
          requestData,
          responseData,
          statusCode: response.status,
          responseTimeMs: endTime.getTime() - startTime.getTime(),
          timestamp: startTime
        }).run();
      } catch (logError) {
        console.error("Failed to log request to history:", logError);
      }
    }
    return proxyResponse;
  } catch (error) {
    const endTime = /* @__PURE__ */ new Date();
    if (error.statusCode) {
      throw error;
    }
    if (error.name === "TimeoutError" || error.code === "ABORT_ERR" || ((_a = error.message) == null ? void 0 : _a.includes("timeout"))) {
      return {
        success: false,
        error: {
          message: "Request timed out",
          code: "TIMEOUT",
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        }
      };
    }
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ECONNRESET") {
      return {
        success: false,
        error: {
          message: "Network error: Unable to connect to target server",
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
    if (error.code === "EAI_AGAIN" || error.code === "ENOENT") {
      return {
        success: false,
        error: {
          message: "DNS resolution failed",
          code: "DNS_ERROR",
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        }
      };
    }
    if (error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || error.code === "CERT_HAS_EXPIRED" || ((_b = error.message) == null ? void 0 : _b.includes("SSL")) || ((_c = error.message) == null ? void 0 : _c.includes("certificate"))) {
      return {
        success: false,
        error: {
          message: "SSL/TLS certificate error",
          code: "SSL_ERROR",
          cause: error.message
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        }
      };
    }
    return {
      success: false,
      error: {
        message: "Request failed",
        code: error.code || "UNKNOWN_ERROR",
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

export { request_post as default };
//# sourceMappingURL=request.post.mjs.map
