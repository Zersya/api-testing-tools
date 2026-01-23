import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, e as savedRequests, f as folders } from '../../../../../nitro/nitro.mjs';
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

const move_put = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.folderId || typeof body.folderId !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Target folder ID is required"
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
    const targetFolder = db.select().from(folders).where(eq(folders.id, body.folderId)).get();
    if (!targetFolder) {
      throw createError({
        statusCode: 404,
        statusMessage: "Target folder not found"
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
    } else {
      const existingRequests = db.select().from(savedRequests).where(eq(savedRequests.folderId, body.folderId)).all();
      const maxOrder = existingRequests.reduce((max, r) => Math.max(max, r.order), -1);
      order = maxOrder + 1;
    }
    const movedRequest = db.update(savedRequests).set({
      folderId: body.folderId,
      order,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(savedRequests.id, id)).returning().get();
    return {
      success: true,
      message: `Request "${existing.name}" moved successfully`,
      request: movedRequest
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error moving request:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to move request"
    });
  }
});

export { move_put as default };
//# sourceMappingURL=move.put.mjs.map
