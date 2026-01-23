import { d as defineEventHandler, g as getHeader, c as createError, n as useRuntimeConfig, u as useStorage } from '../../../nitro/nitro.mjs';
import jwt from 'jsonwebtoken';
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
import 'drizzle-orm';
import 'node:url';

const status_get = defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const authHeader = getHeader(event, "authorization");
  const token = authHeader == null ? void 0 : authHeader.replace("Bearer ", "");
  if (!token) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  try {
    jwt.verify(token, config.jwtSecret);
  } catch (e) {
    throw createError({ statusCode: 401, message: "Invalid token" });
  }
  try {
    const tables = ["workspaces", "projects", "collections", "folders", "saved_requests", "environments", "api_definitions"];
    let totalItems = 0;
    let lastUpdated = null;
    for (const table of tables) {
      const storage = useStorage(table);
      const keys = await storage.getKeys();
      totalItems += keys.length;
      for (const key of keys) {
        const record = await storage.get(key);
        if (record == null ? void 0 : record.updatedAt) {
          const recordUpdated = new Date(record.updatedAt);
          if (!lastUpdated || recordUpdated > lastUpdated) {
            lastUpdated = recordUpdated;
          }
        }
      }
    }
    return {
      isOnline: true,
      lastSyncAt: (lastUpdated == null ? void 0 : lastUpdated.toISOString()) || null,
      nextSyncAt: null,
      pendingChanges: 0,
      status: "idle",
      errorMessage: null,
      conflicts: [],
      totalItems
    };
  } catch (error) {
    console.error("Failed to get sync status:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to get sync status"
    });
  }
});

export { status_get as default };
//# sourceMappingURL=status.get.mjs.map
