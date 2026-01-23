import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, j as environments, k as environmentVariables } from '../../../../nitro/nitro.mjs';
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
      statusMessage: "Environment ID is required"
    });
  }
  try {
    const existing = db.select().from(environments).where(eq(environments.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment not found"
      });
    }
    const variablesToDelete = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, id)).all();
    const variableCount = variablesToDelete.length;
    db.delete(environments).where(eq(environments.id, id)).run();
    if (existing.isActive) {
      const remainingEnvironments = db.select().from(environments).where(eq(environments.projectId, existing.projectId)).all();
      if (remainingEnvironments.length > 0) {
        db.update(environments).set({ isActive: true }).where(eq(environments.id, remainingEnvironments[0].id)).run();
      }
    }
    return {
      success: true,
      message: `Environment "${existing.name}" deleted successfully`,
      deletedVariables: variableCount
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting environment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete environment"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
