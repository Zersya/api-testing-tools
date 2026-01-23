import { d as defineEventHandler, r as readBody, c as createError, b as db, w as workspaces } from '../../../nitro/nitro.mjs';
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

const workspaces_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.name || typeof body.name !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Workspace name is required"
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
  try {
    const existingWorkspaces = db.select().from(workspaces).all();
    const duplicate = existingWorkspaces.find(
      (w) => w.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Workspace "${trimmedName}" already exists`
      });
    }
    const newWorkspace = db.insert(workspaces).values({
      name: trimmedName
    }).returning().get();
    return newWorkspace;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating workspace:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create workspace"
    });
  }
});

export { workspaces_post as default };
//# sourceMappingURL=workspaces.post.mjs.map
