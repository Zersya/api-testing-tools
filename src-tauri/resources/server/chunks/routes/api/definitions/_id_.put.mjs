import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, x as apiDefinitions } from '../../../nitro/nitro.mjs';
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

const _id__put = defineEventHandler(async (event) => {
  var _a;
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Definition ID is required"
      });
    }
    const body = await readBody(event);
    if (!body || Object.keys(body).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No update data provided"
      });
    }
    const updateData = {};
    if (body.name !== void 0) {
      updateData.name = body.name;
    }
    if (body.isPublic !== void 0) {
      updateData.isPublic = body.isPublic;
      if (body.isPublic && !body.publicSlug) {
        updateData.publicSlug = ((_a = body.name) == null ? void 0 : _a.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")) || crypto.randomUUID().slice(0, 8);
      }
      if (!body.isPublic) {
        updateData.publicSlug = null;
      }
    }
    if (body.publicSlug !== void 0) {
      if (body.isPublic === false) {
        throw createError({
          statusCode: 400,
          statusMessage: "Cannot set publicSlug when isPublic is false"
        });
      }
      const slug = body.publicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid publicSlug"
        });
      }
      const existing = db.select().from(apiDefinitions).where(eq(apiDefinitions.publicSlug, slug)).get();
      if (existing && existing.id !== id) {
        throw createError({
          statusCode: 409,
          statusMessage: "Public slug already in use"
        });
      }
      updateData.publicSlug = slug;
      updateData.isPublic = true;
      updateData.updatedAt = /* @__PURE__ */ new Date();
    }
    const updated = db.update(apiDefinitions).set(updateData).where(eq(apiDefinitions.id, id)).returning().get();
    if (!updated) {
      throw createError({
        statusCode: 404,
        statusMessage: "Definition not found"
      });
    }
    return updated;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating definition:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update definition"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
