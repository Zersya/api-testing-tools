import { d as defineEventHandler, r as readBody, c as createError, u as useStorage } from '../../../nitro/nitro.mjs';
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
import 'jsonwebtoken';

const mocks_put = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const body = await readBody(event);
  if (!body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing mock ID"
    });
  }
  const storage = useStorage("mocks");
  const existing = await storage.getItem(body.id);
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Mock not found"
    });
  }
  const normalizedMethod = (body.method || existing.method).toUpperCase();
  const newPath = body.path || existing.path;
  const targetCollection = (_b = (_a = body.collection) != null ? _a : existing.collection) != null ? _b : "root";
  const keys = await storage.getKeys();
  for (const key of keys) {
    if (key === body.id) continue;
    const mock = await storage.getItem(key);
    const mockCollection = (mock == null ? void 0 : mock.collection) || "root";
    if (mock && mock.path === newPath && mock.method === normalizedMethod && mockCollection === targetCollection) {
      throw createError({
        statusCode: 409,
        statusMessage: `Mock with method ${normalizedMethod} and path ${newPath} already exists in collection "${targetCollection}"`
      });
    }
  }
  const updatedMock = {
    ...existing,
    ...body,
    collection: (_d = (_c = body.collection) != null ? _c : existing.collection) != null ? _d : "root",
    method: normalizedMethod,
    /* Ensure method is normalized if updated */
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await storage.setItem(body.id, updatedMock);
  return updatedMock;
});

export { mocks_put as default };
//# sourceMappingURL=mocks.put.mjs.map
