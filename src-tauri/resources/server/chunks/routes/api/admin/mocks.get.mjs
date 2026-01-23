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

const mocks_get = defineEventHandler(async (event) => {
  const storage = useStorage("mocks");
  const keys = await storage.getKeys();
  const mocks = await Promise.all(keys.map(async (key) => {
    const mock = await storage.getItem(key);
    if (mock && !mock.collection) {
      mock.collection = "root";
    }
    return mock;
  }));
  return mocks;
});

export { mocks_get as default };
//# sourceMappingURL=mocks.get.mjs.map
