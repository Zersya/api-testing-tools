import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, p as projects, i as collections } from '../../../../nitro/nitro.mjs';
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

const _id__delete = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is required"
    });
  }
  try {
    const existing = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found"
      });
    }
    const collectionsToDelete = db.select().from(collections).where(eq(collections.projectId, id)).all();
    const collectionCount = collectionsToDelete.length;
    db.delete(projects).where(eq(projects.id, id)).run();
    return {
      success: true,
      message: `Project "${existing.name}" deleted successfully`,
      deletedCollections: collectionCount
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting project:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete project"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
