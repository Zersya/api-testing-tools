import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, e as savedRequests } from '../../../../nitro/nitro.mjs';
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
const _id__put = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request ID is required"
    });
  }
  const body = await readBody(event);
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one field must be provided for update"
    });
  }
  try {
    const existing = db.select().from(savedRequests).where(eq(savedRequests.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Request not found"
      });
    }
    const updateData = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (body.name !== void 0) {
      if (typeof body.name !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Request name must be a string"
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
      updateData.name = trimmedName;
    }
    if (body.method !== void 0) {
      if (typeof body.method !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "HTTP method must be a string"
        });
      }
      const method = body.method.toUpperCase();
      if (!validMethods.includes(method)) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid HTTP method. Must be one of: ${validMethods.join(", ")}`
        });
      }
      updateData.method = method;
    }
    if (body.url !== void 0) {
      if (typeof body.url !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "URL must be a string"
        });
      }
      const trimmedUrl = body.url.trim();
      if (trimmedUrl.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "URL cannot be empty"
        });
      }
      updateData.url = trimmedUrl;
    }
    if (body.headers !== void 0) {
      updateData.headers = body.headers;
    }
    if (body.body !== void 0) {
      updateData.body = body.body;
    }
    if (body.auth !== void 0) {
      updateData.auth = body.auth;
    }
    if (body.order !== void 0) {
      if (typeof body.order !== "number" || !Number.isInteger(body.order)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Order must be an integer"
        });
      }
      updateData.order = body.order;
    }
    const updatedRequest = db.update(savedRequests).set(updateData).where(eq(savedRequests.id, id)).returning().get();
    return updatedRequest;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating request:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update request"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
