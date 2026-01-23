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

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "History entry ID is required"
    });
  }
  try {
    const entry = db.select().from(requestHistories).where(eq(requestHistories.id, id)).get();
    if (!entry) {
      throw createError({
        statusCode: 404,
        statusMessage: "History entry not found"
      });
    }
    return {
      success: true,
      data: entry
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching history entry:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch history entry"
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
