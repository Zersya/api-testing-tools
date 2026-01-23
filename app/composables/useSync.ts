/**
 * Sync Composable - Uses the new sync-service.ts internally
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getSyncQueue, getLocalData } from '~/services/local-store';
import { startAutoSync, stopAutoSync, syncWithServer, type SyncResult } from '~/services/sync-service';

export interface SyncConfig {
  enabled: boolean;
  serverUrl: string;
  apiKey: string;
  syncInterval: number;
  autoSync: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  pendingChanges: number;
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  errorMessage: string | null;
  conflicts: Array<{
    id: string;
    type: string;
    name: string;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
    localData?: any;
    serverData?: any;
  }>;
}

export interface DesktopSyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
  lastSyncedAt: Date;
}

export function useSync() {
  const config = ref<SyncConfig | null>(null);
  const status = ref<SyncStatus | null>(null);
  const isLoading = ref(false);
  const isSyncing = ref(false);
  const statusLoading = ref(true);
  const hasConflicts = computed(() => (status.value?.conflicts?.length || 0) > 0);
  const lastSyncResult = ref<DesktopSyncResult | null>(null);
  const pendingChanges = ref(0);

  let statusPollingInterval: ReturnType<typeof setInterval> | null = null;
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  const isDesktopMode = computed(() => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).__TAURI__;
  });

  const fetchConfig = async () => {
    try {
      if (isDesktopMode.value) {
        const { getServerUrl } = await import('~/services/local-store');
        const serverUrl = await getServerUrl();
        config.value = {
          enabled: true,
          serverUrl,
          apiKey: '',
          syncInterval: 30,
          autoSync: true,
          conflictResolution: 'manual'
        };
      } else {
        const data = await $fetch<any>('/api/admin/sync');
        config.value = data.config || null;
      }
    } catch (e) {
      console.error('Failed to fetch sync config:', e);
    }
  };

  const fetchStatus = async () => {
    statusLoading.value = true;
    try {
      if (isDesktopMode.value) {
        const queue = await getSyncQueue();
        const data = await getLocalData();
        pendingChanges.value = queue.length;
        status.value = {
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          lastSyncAt: data.lastSyncTimestamp || null,
          nextSyncAt: null,
          pendingChanges: queue.length,
          status: 'idle',
          errorMessage: null,
          conflicts: []
        };
      } else {
        const data = await $fetch<any>('/api/admin/sync/status');
        status.value = data;
      }
    } catch (e) {
      console.error('Failed to fetch sync status:', e);
    } finally {
      statusLoading.value = false;
    }
  };

  const countPendingChanges = async (): Promise<number> => {
    if (!isDesktopMode.value) return 0;
    const queue = await getSyncQueue();
    return queue.length;
  };

  const saveConfig = async (newConfig: Partial<SyncConfig>) => {
    isLoading.value = true;
    try {
      if (isDesktopMode.value) {
        const { setServerUrl } = await import('~/services/local-store');
        if (newConfig.serverUrl) {
          await setServerUrl(newConfig.serverUrl);
        }
        await fetchConfig();
        return true;
      } else {
        const existingData = await $fetch<any>('/api/admin/sync');
        const currentConfig = existingData.config || {};
        await $fetch('/api/admin/sync', {
          method: 'POST',
          body: { ...currentConfig, ...newConfig }
        });
        await fetchConfig();
        return true;
      }
    } catch (e) {
      console.error('Failed to save sync config:', e);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const triggerSync = async (): Promise<SyncResult | DesktopSyncResult> => {
    if (isSyncing.value) {
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    isSyncing.value = true;
    try {
      if (isDesktopMode.value) {
        const result = await syncWithServer();
        
        const desktopResult: DesktopSyncResult = {
          success: result.success,
          pushed: result.synced,
          pulled: result.synced,
          conflicts: 0,
          errors: result.errors,
          lastSyncedAt: new Date()
        };
        
        lastSyncResult.value = desktopResult;
        await fetchStatus();
        return desktopResult;
      } else {
        await $fetch('/api/admin/sync/trigger', { method: 'POST' });
        await fetchStatus();
        return { success: true, synced: 0, failed: 0, errors: [] };
      }
    } catch (e) {
      console.error('Sync trigger failed:', e);
      return { success: false, synced: 0, failed: 0, errors: [e instanceof Error ? e.message : 'Sync failed'] };
    } finally {
      isSyncing.value = false;
    }
  };

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    try {
      await triggerSync();
      return true;
    } catch (e) {
      console.error('Failed to resolve conflict:', e);
      return false;
    }
  };

  const startStatusPolling = (intervalMs: number = 30000) => {
    stopStatusPolling();
    statusPollingInterval = setInterval(() => {
      fetchStatus();
    }, intervalMs);
  };

  const startAutoSyncFn = async (intervalMinutes: number = 5) => {
    stopAutoSyncFn();
    if (isDesktopMode.value) {
      startAutoSync(intervalMinutes * 60 * 1000);
    } else {
      syncInterval = setInterval(async () => {
        if (config.value?.enabled && config.value?.autoSync && typeof navigator !== 'undefined' && navigator.onLine) {
          await triggerSync();
        }
      }, intervalMinutes * 60 * 1000);
    }
  };

  const stopStatusPolling = () => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
  };

  const stopAutoSyncFn = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    stopAutoSync();
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'syncing': return 'text-accent-blue';
      case 'error': return 'text-accent-red';
      case 'conflict': return 'text-accent-yellow';
      default: return 'text-accent-green';
    }
  };

  const getStatusLabel = (statusValue: string) => {
    switch (statusValue) {
      case 'syncing': return 'Syncing';
      case 'error': return 'Error';
      case 'conflict': return 'Conflict';
      default: return 'Synced';
    }
  };

  onMounted(async () => {
    await fetchConfig();
    await fetchStatus();

    if (isDesktopMode.value) {
      if (config.value?.autoSync) {
        startAutoSyncFn(config.value.syncInterval || 5);
      }
    } else {
      if (config.value?.enabled && config.value?.autoSync) {
        startStatusPolling((config.value.syncInterval || 60) * 1000);
      }
    }
  });

  onUnmounted(() => {
    stopStatusPolling();
    stopAutoSyncFn();
  });

  return {
    config,
    status,
    isLoading,
    isSyncing,
    statusLoading,
    hasConflicts,
    lastSyncResult,
    pendingChanges,
    fetchConfig,
    fetchStatus,
    saveConfig,
    triggerSync,
    resolveConflict,
    startStatusPolling,
    startAutoSync: startAutoSyncFn,
    stopStatusPolling,
    stopAutoSync: stopAutoSyncFn,
    getStatusColor,
    getStatusLabel
  };
}
