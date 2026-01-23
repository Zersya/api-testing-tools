import { d as defineEventHandler, u as useStorage, r as readBody } from '../../../nitro/nitro.mjs';
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

const settings = defineEventHandler(async (event) => {
  const storage = useStorage("settings");
  const key = "global";
  if (event.method === "GET") {
    return await storage.getItem(key) || { bearerToken: "" };
  }
  if (event.method === "POST") {
    const body = await readBody(event);
    await storage.setItem(key, body);
    return { success: true };
  }
});

export { settings as default };
//# sourceMappingURL=settings.mjs.map
