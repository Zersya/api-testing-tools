import { ref, computed, onMounted, onUnmounted } from 'vue';

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
    localUpdatedAt: string;
    remoteUpdatedAt: string;
  }>;
}

export function useSync() {
  const config = ref<SyncConfig | null>(null);
  const status = ref<SyncStatus | null>(null);
  const isLoading = ref(false);
  const isSyncing = ref(false);
  const statusLoading = ref(true);
  const hasConflicts = computed(() => (status.value?.conflicts?.length || 0) > 0);

  let statusPollingInterval: ReturnType<typeof setInterval> | null = null;

  const fetchConfig = async () => {
    try {
      const data = await $fetch<any>('/api/admin/sync');
      config.value = data.config || null;
    } catch (e) {
      console.error('Failed to fetch sync config:', e);
    }
  };

  const fetchStatus = async () => {
    statusLoading.value = true;
    try {
      const data = await $fetch<any>('/api/admin/sync/status');
      status.value = data;
    } catch (e) {
      console.error('Failed to fetch sync status:', e);
    } finally {
      statusLoading.value = false;
    }
  };

  const saveConfig = async (newConfig: Partial<SyncConfig>) => {
    isLoading.value = true;
    try {
      const existingData = await $fetch<any>('/api/admin/sync');
      const currentConfig = existingData.config || {};
      await $fetch('/api/admin/sync', {
        method: 'POST',
        body: {
          ...currentConfig,
          ...newConfig
        }
      });
      await fetchConfig();
      return true;
    } catch (e) {
      console.error('Failed to save sync config:', e);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const triggerSync = async () => {
    if (isSyncing.value) return;

    isSyncing.value = true;
    try {
      await $fetch('/api/admin/sync/trigger', {
        method: 'POST'
      });
      await fetchStatus();
    } catch (e) {
      console.error('Sync trigger failed:', e);
    } finally {
      isSyncing.value = false;
    }
  };

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    try {
      await $fetch('/api/admin/sync/resolve-conflict', {
        method: 'POST',
        body: { conflictId, resolution }
      });
      await fetchStatus();
      return true;
    } catch (e) {
      console.error('Failed to resolve conflict:', e);
      return false;
    }
  };

  const startStatusPolling = (intervalMs: number = 30000) => {
    stopStatusPolling();
    statusPollingInterval = setInterval(() => {
      if (config.value?.enabled && config.value?.autoSync) {
        fetchStatus();
      }
    }, intervalMs);
  };

  const stopStatusPolling = () => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
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

    if (config.value?.enabled && config.value?.autoSync) {
      startStatusPolling((config.value.syncInterval || 60) * 1000);
    }
  });

  onUnmounted(() => {
    stopStatusPolling();
  });

  return {
    config,
    status,
    isLoading,
    isSyncing,
    statusLoading,
    hasConflicts,
    fetchConfig,
    fetchStatus,
    saveConfig,
    triggerSync,
    resolveConflict,
    startStatusPolling,
    stopStatusPolling,
    getStatusColor,
    getStatusLabel
  };
}
