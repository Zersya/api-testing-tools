import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, w as workspaces, p as projects } from '../../../../../nitro/nitro.mjs';
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

const projects_post = defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, "id");
  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Workspace ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.name || typeof body.name !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Project name is required"
    });
  }
  const trimmedName = body.name.trim();
  if (trimmedName.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project name cannot be empty"
    });
  }
  if (trimmedName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project name cannot exceed 100 characters"
    });
  }
  let baseUrl = null;
  if (body.baseUrl !== void 0 && body.baseUrl !== null) {
    if (typeof body.baseUrl !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Base URL must be a string"
      });
    }
    baseUrl = body.baseUrl.trim() || null;
  }
  try {
    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      throw createError({
        statusCode: 404,
        statusMessage: "Workspace not found"
      });
    }
    const existingProjects = db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all();
    const duplicate = existingProjects.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Project "${trimmedName}" already exists in this workspace`
      });
    }
    const newProject = db.insert(projects).values({
      workspaceId,
      name: trimmedName,
      baseUrl
    }).returning().get();
    return newProject;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating project:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create project"
    });
  }
});

export { projects_post as default };
//# sourceMappingURL=projects.post.mjs.map
