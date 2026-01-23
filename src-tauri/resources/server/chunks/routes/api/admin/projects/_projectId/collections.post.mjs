import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, p as projects, i as collections } from '../../../../../nitro/nitro.mjs';
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

const collections_post = defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "projectId");
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
      statusMessage: "Collection name is required"
    });
  }
  const trimmedName = body.name.trim();
  if (trimmedName.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Collection name cannot be empty"
    });
  }
  if (trimmedName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: "Collection name cannot exceed 100 characters"
    });
  }
  let description = null;
  if (body.description !== void 0 && body.description !== null) {
    if (typeof body.description !== "string") {
      throw createError({
        statusCode: 400,
        statusMessage: "Description must be a string"
      });
    }
    description = body.description.trim() || null;
  }
  let authConfig = null;
  if (body.authConfig !== void 0 && body.authConfig !== null) {
    if (typeof body.authConfig !== "object") {
      throw createError({
        statusCode: 400,
        statusMessage: "Auth config must be an object"
      });
    }
    authConfig = body.authConfig;
  }
  try {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found"
      });
    }
    const existingCollections = db.select().from(collections).where(eq(collections.projectId, projectId)).all();
    const duplicate = existingCollections.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Collection "${trimmedName}" already exists in this project`
      });
    }
    const newCollection = db.insert(collections).values({
      projectId,
      name: trimmedName,
      description,
      authConfig
    }).returning().get();
    return newCollection;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error creating collection:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create collection"
    });
  }
});

export { collections_post as default };
//# sourceMappingURL=collections.post.mjs.map
