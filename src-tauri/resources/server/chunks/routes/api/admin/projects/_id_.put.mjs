import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, p as projects } from '../../../../nitro/nitro.mjs';
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
      statusMessage: "Project ID is required"
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
    const existing = db.select().from(projects).where(eq(projects.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found"
      });
    }
    const updateData = {};
    if (body.name !== void 0) {
      if (typeof body.name !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Project name must be a string"
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
      const projectsInWorkspace = db.select().from(projects).where(eq(projects.workspaceId, existing.workspaceId)).all();
      const duplicate = projectsInWorkspace.find(
        (p) => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Project "${trimmedName}" already exists in this workspace`
        });
      }
      updateData.name = trimmedName;
    }
    if (body.baseUrl !== void 0) {
      if (body.baseUrl === null) {
        updateData.baseUrl = null;
      } else if (typeof body.baseUrl === "string") {
        updateData.baseUrl = body.baseUrl.trim() || null;
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: "Base URL must be a string or null"
        });
      }
    }
    const updatedProject = db.update(projects).set({
      ...updateData,
      updatedAt: sql`(unixepoch())`
    }).where(eq(projects.id, id)).returning().get();
    return updatedProject;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating project:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update project"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
