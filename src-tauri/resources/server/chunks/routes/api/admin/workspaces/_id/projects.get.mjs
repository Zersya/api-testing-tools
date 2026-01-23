import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, w as workspaces, p as projects } from '../../../../../nitro/nitro.mjs';
import { eq, desc } from 'drizzle-orm';
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

const projects_get = defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, "id");
  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Workspace ID is required"
    });
  }
  try {
    const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
    if (!workspace) {
      throw createError({
        statusCode: 404,
        statusMessage: "Workspace not found"
      });
    }
    const workspaceProjects = db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).orderBy(desc(projects.createdAt)).all();
    return workspaceProjects;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching projects:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch projects"
    });
  }
});

export { projects_get as default };
//# sourceMappingURL=projects.get.mjs.map
