import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, p as projects, j as environments } from '../../../../../nitro/nitro.mjs';
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

const environments_post = defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is required"
    });
  }
  const body = await readBody(event);
  if (!body.name || typeof body.name !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Environment name is required"
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
  try {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found"
      });
    }
    const existingEnvironments = db.select().from(environments).where(eq(environments.projectId, projectId)).all();
    const duplicate = existingEnvironments.find(
      (e) => e.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Environment "${trimmedName}" already exists in this project`
      });
    }
    const shouldBeActive = body.isActive === true || existingEnvironments.length === 0;
    if (shouldBeActive) {
      db.update(environments).set({ isActive: false }).where(eq(environments.projectId, projectId)).run();
    }
    const newEnvironment = db.insert(environments).values({
      projectId,
      name: trimmedName,
      isActive: shouldBeActive
    }).returning().get();
    return newEnvironment;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating environment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create environment"
    });
  }
});

export { environments_post as default };
//# sourceMappingURL=environments.post.mjs.map
