import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, j as environments, k as environmentVariables } from '../../../../../nitro/nitro.mjs';
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

const duplicate_post = defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, "id");
  if (!environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Environment ID is required"
    });
  }
  try {
    const existingEnvironment = db.select().from(environments).where(eq(environments.id, environmentId)).get();
    if (!existingEnvironment) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment not found"
      });
    }
    const name = existingEnvironment.name + " (Copy)";
    let finalName = name;
    let counter = 1;
    const environmentsInProject = db.select().from(environments).where(eq(environments.projectId, existingEnvironment.projectId)).all();
    while (environmentsInProject.some((e) => e.name.toLowerCase() === finalName.toLowerCase())) {
      finalName = `${name} (${counter})`;
      counter++;
    }
    db.update(environments).set({ isActive: false }).where(eq(environments.projectId, existingEnvironment.projectId)).run();
    const newEnvironment = db.insert(environments).values({
      projectId: existingEnvironment.projectId,
      name: finalName,
      isActive: true
    }).returning().get();
    const variablesToCopy = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, environmentId)).all();
    for (const variable of variablesToCopy) {
      db.insert(environmentVariables).values({
        environmentId: newEnvironment.id,
        key: variable.key,
        value: variable.value,
        isSecret: variable.isSecret
      }).run();
    }
    return {
      ...newEnvironment,
      variableCount: variablesToCopy.length
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error duplicating environment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to duplicate environment"
    });
  }
});

export { duplicate_post as default };
//# sourceMappingURL=duplicate.post.mjs.map
