interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  pendingChanges: number;
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  errorMessage: string | null;
  conflicts: Array<{
    id: string;
    type: string;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
  }>;
}

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
    return {
      isOnline: true,
      lastSyncAt: null,
      nextSyncAt: null,
      pendingChanges: 0,
      status: 'idle',
      errorMessage: null,
      conflicts: []
    };
  }

  let syncState: SyncState = (await storage.getItem(syncStateKey)) || {
    status: 'idle',
    lastSyncAt: null,
    nextSyncAt: null,
    pendingChanges: 0,
    errorMessage: null,
    conflicts: []
  };

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (syncState.status === 'syncing') {
    const syncStartTime = syncState.lastSyncAt ? new Date(syncState.lastSyncAt).getTime() : 0;
    const syncTimeout = 60000;
    if (Date.now() - syncStartTime > syncTimeout) {
      syncState = {
        ...syncState,
        status: 'error',
        errorMessage: 'Sync timed out',
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
