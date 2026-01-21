import { ref, computed, onMounted, onUnmounted } from 'vue';
import { initDatabase, isDatabaseAvailable } from '../db';
import { getServerUrl } from '../services/settings';
import { getToken } from '../services/auth-store';

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

  const isDesktop = computed(() => {
    if (typeof window === 'undefined') return false;
    return !!(window as any).__TAURI__;
  });

  const fetchConfig = async () => {
    try {
      if (isDesktop.value) {
        const settings = await import('../services/settings').then(m => m.getSettings());
        config.value = {
          enabled: true,
          serverUrl: settings.serverUrl,
          apiKey: '',
          syncInterval: settings.syncInterval,
          autoSync: settings.autoSync,
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
      if (isDesktop.value) {
        const pending = await countPendingChanges();
        pendingChanges.value = pending;
        status.value = {
          isOnline: navigator.onLine,
          lastSyncAt: null,
          nextSyncAt: null,
          pendingChanges: pending,
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
    if (!isDesktop.value) return 0;

    try {
      const db = await initDatabase()
      if (!db) return 0

      const client = db.$client
      const tables = ['workspaces', 'projects', 'collections', 'folders', 'saved_requests', 'environments', 'api_definitions']
      let total = 0

      for (const table of tables) {
        const stmt = client.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE is_dirty = 1`)
        const result = stmt.get() as { count: number }
        total += result.count
      }

      return total
    } catch {
      return 0
    }
  };

  const saveConfig = async (newConfig: Partial<SyncConfig>) => {
    isLoading.value = true;
    try {
      if (isDesktop.value) {
        const { updateSettings } = await import('../services/settings');
        await updateSettings({
          serverUrl: newConfig.serverUrl || 'http://localhost:3000',
          autoSync: newConfig.autoSync ?? true,
          syncInterval: newConfig.syncInterval ?? 5
        });
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

  const triggerSync = async (conflictResolution?: Record<string, 'local' | 'remote'>) => {
    if (isSyncing.value) return;

    isSyncing.value = true;
    try {
      if (isDesktop.value) {
        await desktopSync(conflictResolution);
      } else {
        await $fetch('/api/admin/sync/trigger', { method: 'POST' });
      }
      await fetchStatus();
    } catch (e) {
      console.error('Sync trigger failed:', e);
    } finally {
      isSyncing.value = false;
    }
  };

  const desktopSync = async (conflictResolution?: Record<string, 'local' | 'remote'>): Promise<DesktopSyncResult> => {
    const result: DesktopSyncResult = {
      success: false,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: [],
      lastSyncedAt: new Date()
    };

    try {
      const db = await initDatabase()
      if (!db) {
        result.errors.push('Database not available')
        return result
      }

      const serverUrl = await getServerUrl();
      const token = getToken();

      if (!token) {
        result.errors.push('Not authenticated');
        return result;
      }

      result.pushed = await pushChanges(serverUrl, token, db);
      result.pulled = await pullChanges(serverUrl, token);

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Sync failed');
    }

    lastSyncResult.value = result;
    pendingChanges.value = await countPendingChanges();
    return result;
  };

  const pushChanges = async (serverUrl: string, token: string, db: any): Promise<number> => {
    let count = 0;
    const client = db.$client
    const tables = ['workspaces', 'projects', 'collections', 'folders', 'saved_requests', 'environments', 'api_definitions']

    for (const table of tables) {
      const stmt = client.prepare(`SELECT * FROM ${table} WHERE is_dirty = 1`)
      const dirtyRecords = stmt.all()

      for (const record of dirtyRecords as any[]) {
        try {
          const response = await fetch(`${serverUrl}/api/sync/push`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: table,
              id: record.id,
              data: serializeRecord(record),
              updatedAt: record.updated_at
            })
          });

          if (response.ok) {
            const updateStmt = client.prepare(`
              UPDATE ${table} SET is_dirty = 0, last_synced_at = ? WHERE id = ?
            `)
            updateStmt.run(Date.now(), record.id)
            count++;
          }
        } catch (error) {
          console.error(`Failed to push ${table}/${record.id}:`, error);
        }
      }
    }

    return count;
  };

  const pullChanges = async (serverUrl: string, token: string): Promise<number> => {
    let count = 0;

    try {
      const response = await fetch(`${serverUrl}/api/sync/pull`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to pull');

      const data = await response.json();

      const db = await initDatabase()
      if (!db) return 0

      const client = db.$client

      const entityTypes = [
        { name: 'workspaces', data: data.workspaces || [] },
        { name: 'projects', data: data.projects || [] },
        { name: 'collections', data: data.collections || [] },
        { name: 'folders', data: data.folders || [] },
        { name: 'saved_requests', data: data.saved_requests || [] },
        { name: 'environments', data: data.environments || [] },
        { name: 'api_definitions', data: data.api_definitions || [] }
      ];

      for (const entity of entityTypes) {
        for (const item of entity.data) {
          await upsertEntity(client, entity.name, deserializeRecord(item));
          count++;
        }
      }
    } catch (error) {
      console.error('Pull failed:', error);
    }

    return count;
  };

  const serializeRecord = (record: any): any => {
    const serialized = { ...record };
    delete serialized.id;
    delete serialized.is_dirty;
    delete serialized.last_synced_at;
    return serialized;
  };

  const deserializeRecord = (record: any): any => {
    return {
      ...record,
      updated_at: record.updatedAt ? new Date(record.updatedAt).getTime() : Date.now(),
      created_at: record.createdAt ? new Date(record.createdAt).getTime() : Date.now()
    };
  };

  const upsertEntity = async (client: any, tableName: string, data: any) => {
    const columns = Object.keys(data).filter(k => !['updated_at', 'created_at', 'is_dirty', 'last_synced_at'].includes(k))
    const values = columns.map(() => '?')
    const updates = ['is_dirty = 0', 'last_synced_at = ?']
    const params = [...columns.map(c => data[c]), Date.now(), data.id]

    const stmt = client.prepare(`
      INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}, is_dirty, last_synced_at)
      VALUES (${values.join(', ')}, 0, ?)
      ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')} = ?
    `)

    stmt.run(...params, Date.now())
  };

  const resolveConflict = async (conflictId: string, resolution: 'local' | 'remote') => {
    try {
      if (isDesktop.value) {
        await triggerSync({ [conflictId]: resolution });
      } else {
        await $fetch('/api/admin/sync/resolve-conflict', {
          method: 'POST',
          body: { conflictId, resolution }
        });
      }
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
      fetchStatus();
    }, intervalMs);
  };

  const startAutoSync = async (intervalMinutes: number = 5) => {
    stopAutoSync();
    syncInterval = setInterval(async () => {
      if (config.value?.enabled && config.value?.autoSync && navigator.onLine) {
        await triggerSync();
      }
    }, intervalMinutes * 60 * 1000);
  };

  const stopStatusPolling = () => {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
    }
  };

  const stopAutoSync = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
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

    if (isDesktop.value) {
      if (config.value?.autoSync) {
        startAutoSync(config.value.syncInterval || 5);
      }
    } else {
      if (config.value?.enabled && config.value?.autoSync) {
        startStatusPolling((config.value.syncInterval || 60) * 1000);
      }
    }
  });

  onUnmounted(() => {
    stopStatusPolling();
    stopAutoSync();
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
    startAutoSync,
    stopStatusPolling,
    stopAutoSync,
    getStatusColor,
    getStatusLabel
  };
}
