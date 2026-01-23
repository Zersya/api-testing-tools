import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, f as folders, e as savedRequests } from '../../../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
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
import 'node:url';
import 'jsonwebtoken';

const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const requests_post = defineEventHandler(async (event) => {
  const folderId = getRouterParam(event, "id");
  if (!folderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Folder ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.name || typeof body.name !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Request name is required"
    });
  }
  const trimmedName = body.name.trim();
  if (trimmedName.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request name cannot be empty"
    });
  }
  if (trimmedName.length > 200) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request name cannot exceed 200 characters"
    });
  }
  if (!body.method || typeof body.method !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "HTTP method is required"
    });
  }
  const method = body.method.toUpperCase();
  if (!validMethods.includes(method)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid HTTP method. Must be one of: ${validMethods.join(", ")}`
    });
  }
  if (!body.url || typeof body.url !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "URL is required"
    });
  }
  const trimmedUrl = body.url.trim();
  if (trimmedUrl.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "URL cannot be empty"
    });
  }
  let order = 0;
  if (body.order !== void 0) {
    if (typeof body.order !== "number" || !Number.isInteger(body.order)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Order must be an integer"
      });
    }
    order = body.order;
  }
  try {
    const folder = db.select().from(folders).where(eq(folders.id, folderId)).get();
    if (!folder) {
      throw createError({
        statusCode: 404,
        statusMessage: "Folder not found"
      });
    }
    const existingRequests = db.select().from(savedRequests).where(eq(savedRequests.folderId, folderId)).all();
    if (body.order === void 0) {
      const maxOrder = existingRequests.reduce((max, r) => Math.max(max, r.order), -1);
      order = maxOrder + 1;
    }
    const newRequest = db.insert(savedRequests).values({
      folderId,
      name: trimmedName,
      method,
      url: trimmedUrl,
      headers: body.headers || null,
      body: body.body || null,
      auth: body.auth || null,
      order
    }).returning().get();
    return newRequest;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating request:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create request"
    });
  }
});

export { requests_post as default };
//# sourceMappingURL=requests.post.mjs.map
