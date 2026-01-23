import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, j as environments, k as environmentVariables } from '../../../../../nitro/nitro.mjs';
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

const variables_get = defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, "id");
  if (!environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Environment ID is required"
    });
  }
  try {
    const environment = db.select().from(environments).where(eq(environments.id, environmentId)).get();
    if (!environment) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment not found"
      });
    }
    const variables = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, environmentId)).all();
    return variables.map((v) => ({
      ...v,
      // Mask secret values
      value: v.isSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : v.value
    }));
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching environment variables:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch environment variables"
    });
  }
});

export { variables_get as default };
//# sourceMappingURL=variables.get.mjs.map
