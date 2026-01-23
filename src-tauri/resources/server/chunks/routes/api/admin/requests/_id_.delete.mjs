import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, e as savedRequests } from '../../../../nitro/nitro.mjs';
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

const _id__delete = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request ID is required"
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
    db.delete(savedRequests).where(eq(savedRequests.id, id)).run();
    return {
      success: true,
      message: `Request "${existing.name}" deleted successfully`
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting request:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete request"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
