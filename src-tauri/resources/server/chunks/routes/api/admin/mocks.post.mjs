import { d as defineEventHandler, r as readBody, c as createError, u as useStorage } from '../../../nitro/nitro.mjs';
import { v4 } from 'uuid';
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

const mocks_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.path || !body.method || !body.status) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: path, method, status"
    });
  }
  const normalizedMethod = body.method.toUpperCase();
  const targetCollection = body.collection || "root";
  const storage = useStorage("mocks");
  const keys = await storage.getKeys();
  for (const key of keys) {
    const mock = await storage.getItem(key);
    const mockCollection = (mock == null ? void 0 : mock.collection) || "root";
    if (mock && mock.path === body.path && mock.method === normalizedMethod && mockCollection === targetCollection) {
      throw createError({
        statusCode: 409,
        statusMessage: `Mock with method ${normalizedMethod} and path ${body.path} already exists in collection "${targetCollection}"`
      });
    }
  }
  const id = v4();
  const newMock = {
    id,
    collection: body.collection || "root",
    path: body.path,
    method: normalizedMethod,
    status: body.status,
    response: body.response || {},
    delay: body.delay || 0,
    secure: body.secure || false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await storage.setItem(id, newMock);
  return newMock;
});

export { mocks_post as default };
//# sourceMappingURL=mocks.post.mjs.map
