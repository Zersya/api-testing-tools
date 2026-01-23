import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, j as environments } from '../../../../../nitro/nitro.mjs';
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

const activate_put = defineEventHandler(async (event) => {
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
    if (existing.isActive) {
      return existing;
    }
    db.update(environments).set({ isActive: false }).where(eq(environments.projectId, existing.projectId)).run();
    const activatedEnvironment = db.update(environments).set({ isActive: true }).where(eq(environments.id, id)).returning().get();
    return activatedEnvironment;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error activating environment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to activate environment"
    });
  }
});

export { activate_put as default };
//# sourceMappingURL=activate.put.mjs.map
