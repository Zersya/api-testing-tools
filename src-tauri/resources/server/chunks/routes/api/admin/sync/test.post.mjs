import { d as defineEventHandler, r as readBody, c as createError } from '../../../../nitro/nitro.mjs';
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

const test_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { serverUrl, apiKey } = body;
  if (!serverUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "Server URL is required"
    });
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5e3);
    const response = await fetch(`${serverUrl}/api/health`, {
      method: "GET",
      headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      return { success: true, message: "Connection successful" };
    }
    return { success: false, message: `Server returned status ${response.status}` };
  } catch (error) {
    if (error.name === "AbortError") {
      return { success: false, message: "Connection timed out" };
    }
    return { success: false, message: "Could not connect to server" };
  }
});

export { test_post as default };
//# sourceMappingURL=test.post.mjs.map
