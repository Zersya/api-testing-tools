import { d as defineEventHandler, u as useStorage, c as createError } from '../../../../nitro/nitro.mjs';
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

const trigger_post = defineEventHandler(async (event) => {
  const storage = useStorage("settings");
  const settings = await storage.getItem("global") || {};
  const syncConfig = settings.sync || { enabled: false };
  const syncStateKey = "sync-state";
  if (!syncConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "Sync is not enabled"
    });
  }
  let syncState = await storage.getItem(syncStateKey) || {
    status: "idle",
    lastSyncAt: null,
    nextSyncAt: null,
    pendingChanges: 0,
    errorMessage: null,
    conflicts: []
  };
  if (syncState.status === "syncing") {
    throw createError({
      statusCode: 400,
      statusMessage: "Sync already in progress"
    });
  }
  syncState = {
    ...syncState,
    status: "syncing",
    errorMessage: null,
    lastSyncAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await storage.setItem(syncStateKey, syncState);
  const syncInterval = syncConfig.syncInterval || 60;
  syncState = {
    ...syncState,
    status: "idle",
    nextSyncAt: new Date(Date.now() + syncInterval * 1e3).toISOString(),
    pendingChanges: Math.floor(Math.random() * 3)
  };
  const conflictChance = Math.random();
  if (conflictChance < 0.1) {
    syncState.conflicts = [
      {
        id: "conflict-1",
        type: "request",
        localUpdatedAt: new Date(Date.now() - 36e5).toISOString(),
        remoteUpdatedAt: new Date(Date.now() - 18e5).toISOString()
      }
    ];
    syncState.status = "conflict";
  } else {
    syncState.conflicts = [];
  }
  await storage.setItem(syncStateKey, syncState);
  return {
    success: true,
    status: syncState.status,
    lastSyncAt: syncState.lastSyncAt,
    pendingChanges: syncState.pendingChanges,
    conflicts: syncState.conflicts
  };
});

export { trigger_post as default };
//# sourceMappingURL=trigger.post.mjs.map
