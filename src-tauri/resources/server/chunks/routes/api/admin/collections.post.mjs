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

const collections_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: "Collection name is required"
    });
  }
  if (body.name.toLowerCase() === "root") {
    throw createError({
      statusCode: 409,
      statusMessage: 'Cannot create a collection named "root" - it is reserved'
    });
  }
  const storage = useStorage("collections");
  const keys = await storage.getKeys();
  for (const key of keys) {
    const existing = await storage.getItem(key);
    if (existing && existing.name.toLowerCase() === body.name.toLowerCase()) {
      throw createError({
        statusCode: 409,
        statusMessage: `Collection "${body.name}" already exists`
      });
    }
  }
  let maxOrder = 0;
  for (const key of keys) {
    const existing = await storage.getItem(key);
    if (existing && existing.order > maxOrder) {
      maxOrder = existing.order;
    }
  }
  const id = v4();
  const newCollection = {
    id,
    name: body.name,
    description: body.description || "",
    color: body.color || "#6366f1",
    order: (_a = body.order) != null ? _a : maxOrder + 1,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await storage.setItem(id, newCollection);
  return newCollection;
});

export { collections_post as default };
//# sourceMappingURL=collections.post.mjs.map
