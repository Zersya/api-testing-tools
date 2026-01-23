import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, e as savedRequests } from '../../../../../nitro/nitro.mjs';
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

const requests_get = defineEventHandler(async (event) => {
  const folderId = getRouterParam(event, "id");
  if (!folderId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Folder ID is required"
    });
  }
  try {
    const requests = db.select().from(savedRequests).where(eq(savedRequests.folderId, folderId)).orderBy(savedRequests.order).all();
    return requests;
  } catch (error) {
    console.error("Error fetching requests:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch requests"
    });
  }
});

export { requests_get as default };
//# sourceMappingURL=requests.get.mjs.map
