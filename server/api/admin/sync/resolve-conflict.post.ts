interface Conflict {
  id: string;
  type: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
}

interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  pendingChanges: number;
  errorMessage: string | null;
  conflicts: Conflict[];
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { conflictId, resolution } = body;

  if (!conflictId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Conflict ID is required'
    });
  }

  if (!['local', 'remote'].includes(resolution)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Resolution must be "local" or "remote"'
    });
  }

  const storage = useStorage('settings');
  const settings = (await storage.getItem('global')) || {};
  const syncConfig = settings.sync || { enabled: false };

  if (!syncConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sync is not enabled'
    });
  }

  const syncStateKey = 'sync-state';
  let syncState: SyncState = (await storage.getItem(syncStateKey)) || {
    status: 'idle',
    lastSyncAt: null,
    nextSyncAt: null,
    pendingChanges: 0,
    errorMessage: null,
    conflicts: []
  };

  const conflictIndex = syncState.conflicts.findIndex(c => c.id === conflictId);
  if (conflictIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Conflict not found'
    });
  }

  syncState.conflicts.splice(conflictIndex, 1);

  if (syncState.conflicts.length === 0) {
    syncState.status = 'idle';
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
