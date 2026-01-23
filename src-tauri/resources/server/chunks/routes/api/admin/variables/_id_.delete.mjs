import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, k as environmentVariables } from '../../../../nitro/nitro.mjs';
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
      statusMessage: "Variable ID is required"
    });
  }
  try {
    const existing = db.select().from(environmentVariables).where(eq(environmentVariables.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment variable not found"
      });
    }
    db.delete(environmentVariables).where(eq(environmentVariables.id, id)).run();
    return {
      success: true,
      message: `Variable "${existing.key}" deleted successfully`
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting environment variable:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete environment variable"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
