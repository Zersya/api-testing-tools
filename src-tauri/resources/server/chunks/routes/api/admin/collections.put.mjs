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

const collections_put = defineEventHandler(async (event) => {
  var _a, _b, _c, _d;
  const body = await readBody(event);
  if (!body.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Collection ID is required"
    });
  }
  const storage = useStorage("collections");
  const existing = await storage.getItem(body.id);
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Collection not found"
    });
  }
  if (existing.name === "root" && body.name && body.name.toLowerCase() !== "root") {
    throw createError({
      statusCode: 403,
      statusMessage: "Cannot rename the root collection"
    });
  }
  if (body.name && body.name.toLowerCase() !== existing.name.toLowerCase()) {
    const keys = await storage.getKeys();
    for (const key of keys) {
      if (key === body.id) continue;
      const other = await storage.getItem(key);
      if (other && other.name.toLowerCase() === body.name.toLowerCase()) {
        throw createError({
          statusCode: 409,
          statusMessage: `Collection "${body.name}" already exists`
        });
      }
    }
  }
  const updatedCollection = {
    ...existing,
    name: (_a = body.name) != null ? _a : existing.name,
    description: (_b = body.description) != null ? _b : existing.description,
    color: (_c = body.color) != null ? _c : existing.color,
    order: (_d = body.order) != null ? _d : existing.order,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await storage.setItem(body.id, updatedCollection);
  return updatedCollection;
});

export { collections_put as default };
//# sourceMappingURL=collections.put.mjs.map
