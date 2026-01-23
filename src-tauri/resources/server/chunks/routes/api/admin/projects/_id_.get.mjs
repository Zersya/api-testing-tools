import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, p as projects, i as collections } from '../../../../nitro/nitro.mjs';
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

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is required"
    });
  }
  try {
    const project = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found"
      });
    }
    const projectCollections = db.select().from(collections).where(eq(collections.projectId, id)).orderBy(desc(collections.createdAt)).all();
    return {
      ...project,
      collections: projectCollections
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching project:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch project"
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
