import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, p as projects, j as environments, k as environmentVariables } from '../../../../../nitro/nitro.mjs';
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

const environments_get = defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is required"
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
    const projectEnvironments = db.select().from(environments).where(eq(environments.projectId, projectId)).orderBy(desc(environments.createdAt)).all();
    const environmentsWithVariables = projectEnvironments.map((env) => {
      const variables = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, env.id)).all();
      return {
        ...env,
        variables: variables.map((v) => ({
          ...v,
          // Mask secret values
          value: v.isSecret ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : v.value
        }))
      };
    });
    return environmentsWithVariables;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching environments:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch environments"
    });
  }
});

export { environments_get as default };
//# sourceMappingURL=environments.get.mjs.map
