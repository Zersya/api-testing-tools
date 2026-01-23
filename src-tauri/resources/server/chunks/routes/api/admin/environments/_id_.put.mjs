import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, j as environments } from '../../../../nitro/nitro.mjs';
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
      statusMessage: "Environment ID is required"
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
    const existing = db.select().from(environments).where(eq(environments.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment not found"
      });
    }
    const updateData = {};
    if (body.name !== void 0) {
      if (typeof body.name !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Environment name must be a string"
        });
      }
      const trimmedName = body.name.trim();
      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Environment name cannot be empty"
        });
      }
      if (trimmedName.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: "Environment name cannot exceed 100 characters"
        });
      }
      const environmentsInProject = db.select().from(environments).where(eq(environments.projectId, existing.projectId)).all();
      const duplicate = environmentsInProject.find(
        (e) => e.id !== id && e.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Environment "${trimmedName}" already exists in this project`
        });
      }
      updateData.name = trimmedName;
    }
    const updatedEnvironment = db.update(environments).set(updateData).where(eq(environments.id, id)).returning().get();
    return updatedEnvironment;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating environment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update environment"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
