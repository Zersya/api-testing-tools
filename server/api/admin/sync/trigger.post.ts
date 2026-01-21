interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  pendingChanges: number;
  errorMessage: string | null;
  conflicts: Array<{
    id: string;
    type: string;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
  }>;
}

export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const settings = (await storage.getItem('global')) || {};
  const syncConfig = settings.sync || { enabled: false };
  const syncStateKey = 'sync-state';

  if (!syncConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sync is not enabled'
    });
  }

  let syncState: SyncState = (await storage.getItem(syncStateKey)) || {
    status: 'idle',
    lastSyncAt: null,
    nextSyncAt: null,
    pendingChanges: 0,
    errorMessage: null,
    conflicts: []
  };

  if (syncState.status === 'syncing') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sync already in progress'
    });
  }

  syncState = {
    ...syncState,
    status: 'syncing',
    errorMessage: null,
    lastSyncAt: new Date().toISOString()
  };
  await storage.setItem(syncStateKey, syncState);

  const syncInterval = syncConfig.syncInterval || 60;
  syncState = {
    ...syncState,
    status: 'idle',
    nextSyncAt: new Date(Date.now() + syncInterval * 1000).toISOString(),
    pendingChanges: Math.floor(Math.random() * 3)
  };

  const conflictChance = Math.random();
  if (conflictChance < 0.1) {
    syncState.conflicts = [
      {
        id: 'conflict-1',
        type: 'request',
        localUpdatedAt: new Date(Date.now() - 3600000).toISOString(),
        remoteUpdatedAt: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    syncState.status = 'conflict';
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
