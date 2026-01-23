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

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable ID is required"
    });
  }
  try {
    const variable = db.select().from(environmentVariables).where(eq(environmentVariables.id, id)).get();
    if (!variable) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment variable not found"
      });
    }
    return {
      ...variable,
      // Mask secret values
      value: variable.isSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : variable.value
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching environment variable:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch environment variable"
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
