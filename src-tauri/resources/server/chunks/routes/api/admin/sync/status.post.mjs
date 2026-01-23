import { d as defineEventHandler, u as useStorage } from '../../../../nitro/nitro.mjs';
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

const status_post = defineEventHandler(async (event) => {
  const storage = useStorage("settings");
  const settings = await storage.getItem("global") || {};
  const syncConfig = settings.sync || { enabled: false };
  const syncStateKey = "sync-state";
  if (!syncConfig.enabled) {
    return {
      isOnline: true,
      lastSyncAt: null,
      nextSyncAt: null,
      pendingChanges: 0,
      status: "idle",
      errorMessage: null,
      conflicts: []
    };
  }
  let syncState = await storage.getItem(syncStateKey) || {
    status: "idle",
    lastSyncAt: null,
    nextSyncAt: null,
    pendingChanges: 0,
    errorMessage: null,
    conflicts: []
  };
  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (syncState.status === "syncing") {
    const syncStartTime = syncState.lastSyncAt ? new Date(syncState.lastSyncAt).getTime() : 0;
    const syncTimeout = 6e4;
    if (Date.now() - syncStartTime > syncTimeout) {
      syncState = {
        ...syncState,
        status: "error",
        errorMessage: "Sync timed out",
        lastSyncAt: syncState.lastSyncAt
      };
      await storage.setItem(syncStateKey, syncState);
    }
  }
  return {
    isOnline,
    lastSyncAt: syncState.lastSyncAt,
    nextSyncAt: syncState.nextSyncAt,
    pendingChanges: syncState.pendingChanges,
    status: syncState.status,
    errorMessage: syncState.errorMessage,
    conflicts: syncState.conflicts
  };
});

export { status_post as default };
//# sourceMappingURL=status.post.mjs.map
