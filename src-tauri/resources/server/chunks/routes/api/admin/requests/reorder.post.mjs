import { d as defineEventHandler, r as readBody, c as createError, b as db, e as savedRequests } from '../../../../nitro/nitro.mjs';
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

const reorder_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.folderId || !body.updates || !Array.isArray(body.updates)) {
    throw createError({
      statusCode: 400,
      statusMessage: "folderId and updates array are required"
    });
  }
  if (body.updates.length === 0) {
    return { success: true, message: "No updates to process" };
  }
  try {
    for (const update of body.updates) {
      if (!update.id || typeof update.folderId !== "string" || typeof update.order !== "number") {
        throw createError({
          statusCode: 400,
          statusMessage: "Each update must have id, folderId, and order"
        });
      }
      const existing = db.select().from(savedRequests).where(eq(savedRequests.id, update.id)).get();
      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: `Request ${update.id} not found`
        });
      }
    }
    const updatedRequests = [];
    for (const update of body.updates) {
      const updateData = {
        folderId: update.folderId,
        order: update.order,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const updated = db.update(savedRequests).set(updateData).where(eq(savedRequests.id, update.id)).returning().get();
      updatedRequests.push(updated);
    }
    return {
      success: true,
      message: `Updated ${updatedRequests.length} requests`,
      requests: updatedRequests
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error reordering requests:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to reorder requests"
    });
  }
});

export { reorder_post as default };
//# sourceMappingURL=reorder.post.mjs.map
