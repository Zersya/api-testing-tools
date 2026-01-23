import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, k as environmentVariables } from '../../../../nitro/nitro.mjs';
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

const _id__put = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Variable ID is required"
    });
  }
  const body = await readBody(event);
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one field must be provided for update"
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
    const updateData = {};
    if (body.key !== void 0) {
      if (typeof body.key !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Variable key must be a string"
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
      const variablesInEnvironment = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, existing.environmentId)).all();
      const duplicate = variablesInEnvironment.find(
        (v) => v.id !== id && v.key === trimmedKey
      );
      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Variable "${trimmedKey}" already exists in this environment`
        });
      }
      updateData.key = trimmedKey;
    }
    if (body.value !== void 0) {
      if (typeof body.value !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Variable value must be a string"
        });
      }
      updateData.value = body.value;
    }
    if (body.isSecret !== void 0) {
      if (typeof body.isSecret !== "boolean") {
        throw createError({
          statusCode: 400,
          statusMessage: "isSecret must be a boolean"
        });
      }
      updateData.isSecret = body.isSecret;
    }
    const updatedVariable = db.update(environmentVariables).set(updateData).where(eq(environmentVariables.id, id)).returning().get();
    return {
      ...updatedVariable,
      // Mask secret values in response
      value: updatedVariable.isSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : updatedVariable.value
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating environment variable:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update environment variable"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
