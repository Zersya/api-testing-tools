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

const index = defineEventHandler(async (event) => {
  var _a, _b;
  const storage = useStorage("settings");
  const key = "global";
  if (event.method === "GET") {
    const settings = await storage.getItem(key) || {};
    return {
      config: settings.sync || {
        enabled: false,
        serverUrl: "",
        apiKey: "",
        syncInterval: 60,
        autoSync: true,
        conflictResolution: "manual"
      }
    };
  }
  if (event.method === "POST") {
    const body = await readBody(event);
    const settings = await storage.getItem(key) || {};
    settings.sync = {
      enabled: (_a = body.enabled) != null ? _a : false,
      serverUrl: body.serverUrl || "",
      apiKey: body.apiKey || "",
      syncInterval: body.syncInterval || 60,
      autoSync: (_b = body.autoSync) != null ? _b : true,
      conflictResolution: body.conflictResolution || "manual"
    };
    await storage.setItem(key, settings);
    return { success: true };
  }
});

export { index as default };
//# sourceMappingURL=index.mjs.map
