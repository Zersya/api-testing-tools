import { d as defineEventHandler, b as db, w as workspaces, c as createError } from '../../../nitro/nitro.mjs';
import { desc } from 'drizzle-orm';
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

const workspaces_get = defineEventHandler(async (event) => {
  try {
    const allWorkspaces = db.select().from(workspaces).orderBy(desc(workspaces.createdAt)).all();
    return allWorkspaces;
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch workspaces"
    });
  }
});

export { workspaces_get as default };
//# sourceMappingURL=workspaces.get.mjs.map
