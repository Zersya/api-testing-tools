import { d as defineEventHandler, a as getQuery, c as createError, u as useStorage } from '../../../nitro/nitro.mjs';
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
import 'drizzle-orm';
import 'node:url';
import 'jsonwebtoken';

const mocks_delete = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = query.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing mock ID"
    });
  }
  const storage = useStorage("mocks");
  if (!await storage.hasItem(id)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Mock not found"
    });
  }
  await storage.removeItem(id);
  return { success: true };
});

export { mocks_delete as default };
//# sourceMappingURL=mocks.delete.mjs.map
