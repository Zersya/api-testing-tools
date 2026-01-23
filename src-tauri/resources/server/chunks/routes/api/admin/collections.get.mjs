import { d as defineEventHandler, u as useStorage } from '../../../nitro/nitro.mjs';
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

const collections_get = defineEventHandler(async (event) => {
  const storage = useStorage("collections");
  const keys = await storage.getKeys();
  let collections = await Promise.all(keys.map(async (key) => {
    return await storage.getItem(key);
  }));
  const hasRoot = collections.some((c) => c.name === "root");
  if (!hasRoot) {
    const rootCollection = {
      id: "root",
      name: "root",
      description: "Default collection for all APIs",
      color: "#6366f1",
      order: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await storage.setItem("root", rootCollection);
    collections.unshift(rootCollection);
  }
  collections.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name);
  });
  return collections;
});

export { collections_get as default };
//# sourceMappingURL=collections.get.mjs.map
