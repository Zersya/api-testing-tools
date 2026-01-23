import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, j as environments, k as environmentVariables } from '../../../../../nitro/nitro.mjs';
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

const variables_post = defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, "id");
  if (!environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Environment ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.key || typeof body.key !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable key is required"
    });
  }
  const trimmedKey = body.key.trim();
  if (trimmedKey.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable key cannot be empty"
    });
  }
  if (trimmedKey.length > 255) {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable key cannot exceed 255 characters"
    });
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable key must start with a letter or underscore and contain only alphanumeric characters and underscores"
    });
  }
  if (body.value === void 0 || body.value === null) {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable value is required"
    });
  }
  if (typeof body.value !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable value must be a string"
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
    const existingVariables = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, environmentId)).all();
    const duplicate = existingVariables.find((v) => v.key === trimmedKey);
    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Variable "${trimmedKey}" already exists in this environment`
      });
    }
    const newVariable = db.insert(environmentVariables).values({
      environmentId,
      key: trimmedKey,
      value: body.value,
      isSecret: body.isSecret === true
    }).returning().get();
    return {
      ...newVariable,
      // Mask secret values in response
      value: newVariable.isSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : newVariable.value
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating environment variable:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create environment variable"
    });
  }
});

export { variables_post as default };
//# sourceMappingURL=variables.post.mjs.map
