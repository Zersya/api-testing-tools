import { d as defineEventHandler, g as getHeader, c as createError, n as useRuntimeConfig, r as readBody, u as useStorage } from '../../../nitro/nitro.mjs';
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

const push_post = defineEventHandler(async (event) => {
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
  const body = await readBody(event);
  const { type, id, data, updatedAt } = body;
  if (!type || !id || !data) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  const tableMap = {
    workspaces: "workspaces",
    projects: "projects",
    collections: "collections",
    folders: "folders",
    saved_requests: "saved_requests",
    environments: "environments",
    api_definitions: "api_definitions"
  };
  const tableName = tableMap[type];
  if (!tableName) {
    throw createError({ statusCode: 400, message: "Invalid entity type" });
  }
  try {
    await pushToStorage(tableName, id, data, updatedAt);
    return {
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (error) {
    console.error("Sync push failed:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Sync failed"
    });
  }
});
async function pushToStorage(tableName, id, data, updatedAt) {
  const storage = useStorage(tableName);
  const key = id;
  const existingData = await storage.get(key);
  if (existingData) {
    const existingUpdatedAt = existingData.updatedAt ? new Date(existingData.updatedAt).getTime() : 0;
    const incomingUpdatedAt = new Date(updatedAt).getTime();
    if (existingUpdatedAt > incomingUpdatedAt) {
      return { skipped: true, reason: "Server version is newer" };
    }
  }
  const record = {
    ...data,
    updatedAt: new Date(updatedAt).toISOString(),
    lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await storage.set(key, record);
  return { success: true };
}

export { push_post as default };
//# sourceMappingURL=push.post.mjs.map
