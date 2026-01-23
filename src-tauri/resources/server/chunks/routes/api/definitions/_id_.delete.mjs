import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, x as apiDefinitions } from '../../../nitro/nitro.mjs';
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
    throw createError({ statusCode: 400, statusMessage: "ID is required" });
  }
  try {
    const deleted = db.delete(apiDefinitions).where(eq(apiDefinitions.id, id)).run();
    if (deleted.changes === 0) {
      throw createError({ statusCode: 404, statusMessage: "Definition not found" });
    }
    return { success: true };
  } catch (e) {
    if (e.statusCode) throw e;
    throw createError({ statusCode: 500, statusMessage: "Failed to delete definition" });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
