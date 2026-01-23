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

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request ID is required"
    });
  }
  try {
    const request = db.select().from(savedRequests).where(eq(savedRequests.id, id)).get();
    if (!request) {
      throw createError({
        statusCode: 404,
        statusMessage: "Request not found"
      });
    }
    return request;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching request:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch request"
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
