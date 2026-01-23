import { d as defineEventHandler, r as readBody, c as createError, u as useStorage } from '../../../../nitro/nitro.mjs';
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

const resolveConflict_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { conflictId, resolution } = body;
  if (!conflictId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Conflict ID is required"
    });
  }
  if (!["local", "remote"].includes(resolution)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Resolution must be "local" or "remote"'
    });
  }
  const storage = useStorage("settings");
  const settings = await storage.getItem("global") || {};
  const syncConfig = settings.sync || { enabled: false };
  if (!syncConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "Sync is not enabled"
    });
  }
  const syncStateKey = "sync-state";
  let syncState = await storage.getItem(syncStateKey) || {
    status: "idle",
    lastSyncAt: null,
    nextSyncAt: null,
    pendingChanges: 0,
    errorMessage: null,
    conflicts: []
  };
  const conflictIndex = syncState.conflicts.findIndex((c) => c.id === conflictId);
  if (conflictIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: "Conflict not found"
    });
  }
  syncState.conflicts.splice(conflictIndex, 1);
  if (syncState.conflicts.length === 0) {
    syncState.status = "idle";
  }
  await storage.setItem(syncStateKey, syncState);
  return {
    success: true,
    resolvedConflictId: conflictId,
    resolution,
    remainingConflicts: syncState.conflicts.length,
    newStatus: syncState.status
  };
});

export { resolveConflict_post as default };
//# sourceMappingURL=resolve-conflict.post.mjs.map
