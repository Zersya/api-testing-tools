import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, w as workspaces } from '../../../../nitro/nitro.mjs';
import { eq, sql } from 'drizzle-orm';
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
      statusMessage: "Workspace ID is required"
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
    const existing = db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Workspace not found"
      });
    }
    const updateData = {};
    if (body.name !== void 0) {
      if (typeof body.name !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Workspace name must be a string"
        });
      }
      const trimmedName = body.name.trim();
      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Workspace name cannot be empty"
        });
      }
      if (trimmedName.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: "Workspace name cannot exceed 100 characters"
        });
      }
      const allWorkspaces = db.select().from(workspaces).all();
      const duplicate = allWorkspaces.find(
        (w) => w.id !== id && w.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Workspace "${trimmedName}" already exists`
        });
      }
      updateData.name = trimmedName;
    }
    const updatedWorkspace = db.update(workspaces).set({
      ...updateData,
      updatedAt: sql`(unixepoch())`
    }).where(eq(workspaces.id, id)).returning().get();
    return updatedWorkspace;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating workspace:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update workspace"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
