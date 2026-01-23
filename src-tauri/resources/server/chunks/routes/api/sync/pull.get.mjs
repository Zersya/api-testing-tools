import { d as defineEventHandler, g as getHeader, c as createError, n as useRuntimeConfig, a as getQuery, u as useStorage } from '../../../nitro/nitro.mjs';
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

const pull_get = defineEventHandler(async (event) => {
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
  const query = getQuery(event);
  const since = query.since;
  try {
    const result = await pullFromStorage(since);
    return {
      ...result,
      lastSyncTimestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("Sync pull failed:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Sync failed"
    });
  }
});
async function pullFromStorage(since) {
  const tables = ["workspaces", "projects", "collections", "folders", "saved_requests", "environments", "api_definitions"];
  const result = {};
  for (const table of tables) {
    const storage = useStorage(table);
    const keys = await storage.getKeys();
    const records = [];
    for (const key of keys) {
      const record = await storage.get(key);
      if (since) {
        const recordUpdatedAt = record.updatedAt ? new Date(record.updatedAt).getTime() : 0;
        const sinceTimestamp = new Date(since).getTime();
        if (recordUpdatedAt > sinceTimestamp) {
          records.push(transformRecord(table, key, record));
        }
      } else {
        records.push(transformRecord(table, key, record));
      }
    }
    const tableKey = table === "saved_requests" ? "saved_requests" : table === "api_definitions" ? "api_definitions" : table;
    result[tableKey] = records;
  }
  return result;
}
function transformRecord(table, id, record) {
  const transformed = {
    id,
    ...record
  };
  delete transformed.updatedAt;
  delete transformed.lastSyncedAt;
  return transformed;
}

export { pull_get as default };
//# sourceMappingURL=pull.get.mjs.map
