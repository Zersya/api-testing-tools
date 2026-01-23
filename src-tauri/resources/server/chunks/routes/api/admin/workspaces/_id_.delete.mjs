import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, w as workspaces, p as projects } from '../../../../nitro/nitro.mjs';
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

const PERSONAL_WORKSPACE_ID = "personal";
const _id__delete = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Workspace ID is required"
    });
  }
  if (id === PERSONAL_WORKSPACE_ID) {
    throw createError({
      statusCode: 403,
      statusMessage: "Cannot delete the default Personal workspace"
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
    const projectsToDelete = db.select().from(projects).where(eq(projects.workspaceId, id)).all();
    const projectCount = projectsToDelete.length;
    db.delete(workspaces).where(eq(workspaces.id, id)).run();
    return {
      success: true,
      message: `Workspace "${existing.name}" deleted successfully`,
      deletedProjects: projectCount
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting workspace:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete workspace"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
