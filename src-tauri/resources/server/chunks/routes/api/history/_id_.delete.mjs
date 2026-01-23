import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, z as requestHistories } from '../../../nitro/nitro.mjs';
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
      statusMessage: "History entry ID is required"
    });
  }
  try {
    const existing = db.select().from(requestHistories).where(eq(requestHistories.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "History entry not found"
      });
    }
    db.delete(requestHistories).where(eq(requestHistories.id, id)).run();
    return {
      success: true,
      message: "History entry deleted successfully",
      deletedId: id
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting history entry:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete history entry"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
