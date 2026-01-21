<script setup lang="ts">
interface SyncConfig {
  enabled: boolean;
  serverUrl: string;
  apiKey: string;
  syncInterval: number;
  autoSync: boolean;
  conflictResolution: 'local' | 'remote' | 'manual';
}

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

const settingsForm = ref<SyncConfig>({
  enabled: false,
  serverUrl: '',
  apiKey: '',
  syncInterval: 60,
  autoSync: true,
  conflictResolution: 'manual'
});

const syncStatus = ref<SyncStatus | null>(null);
const isLoading = ref(false);
const isSyncing = ref(false);
const statusLoading = ref(true);
const saveStatus = ref<'idle' | 'success' | 'error'>('idle');
const saveMessage = ref('');
const testConnectionStatus = ref<'idle' | 'testing' | 'success' | 'error'>('idle');

const fetchSettings = async () => {
  try {
    const data = await $fetch<any>('/api/admin/sync');
    const syncSettings = data.config || {};
    settingsForm.value = {
      enabled: syncSettings.enabled || false,
      serverUrl: syncSettings.serverUrl || '',
      apiKey: syncSettings.apiKey || '',
      syncInterval: syncSettings.syncInterval || 60,
      autoSync: syncSettings.autoSync ?? true,
      conflictResolution: syncSettings.conflictResolution || 'manual'
    };
  } catch (e: any) {
    console.error('Failed to fetch sync settings:', e);
  }
};

const fetchStatus = async () => {
  statusLoading.value = true;
  try {
    const data = await $fetch<any>('/api/admin/sync/status');
    syncStatus.value = data;
  } catch (e: any) {
    console.error('Failed to fetch sync status:', e);
  } finally {
    statusLoading.value = false;
  }
};

const saveSettings = async () => {
  isLoading.value = true;
  saveStatus.value = 'idle';

  try {
    await $fetch('/api/admin/sync', {
      method: 'POST',
      body: settingsForm.value
    });
    saveStatus.value = 'success';
    saveMessage.value = 'Sync settings saved successfully';
    setTimeout(() => {
      saveStatus.value = 'idle';
      saveMessage.value = '';
    }, 3000);
  } catch (e: any) {
    saveStatus.value = 'error';
    saveMessage.value = e.data?.message || e.message || 'Failed to save settings';
  } finally {
    isLoading.value = false;
  }
};

const testConnection = async () => {
  if (!settingsForm.value.serverUrl) {
    alert('Please enter a sync server URL first');
    return;
  }

  testConnectionStatus.value = 'testing';

  try {
    const response = await $fetch('/api/admin/sync/test', {
      method: 'POST',
      body: {
        serverUrl: settingsForm.value.serverUrl,
        apiKey: settingsForm.value.apiKey
      }
    });

    if (response.success) {
      testConnectionStatus.value = 'success';
      setTimeout(() => {
        testConnectionStatus.value = 'idle';
      }, 3000);
    } else {
      testConnectionStatus.value = 'error';
    }
  } catch (e: any) {
    testConnectionStatus.value = 'error';
  }
};

const triggerSync = async () => {
  isSyncing.value = true;

  try {
    await $fetch('/api/admin/sync/trigger', {
      method: 'POST'
    });
    await fetchStatus();
  } catch (e: any) {
    alert('Sync failed: ' + (e.data?.message || e.message));
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
  } catch (e: any) {
    alert('Failed to resolve conflict: ' + (e.data?.message || e.message));
  }
};

const formatDate = (date: string | null) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'syncing': return 'text-accent-blue';
    case 'error': return 'text-accent-red';
    case 'conflict': return 'text-accent-yellow';
    default: return 'text-accent-green';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'syncing':
      return '<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>';
    case 'error':
      return '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
    case 'conflict':
      return '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
    default:
      return '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
  }
};

onMounted(() => {
  fetchSettings();
  fetchStatus();
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader title="Cloud Sync Configuration" />

    <main class="flex-1 overflow-hidden bg-bg-primary">
      <div class="h-full flex flex-col max-w-4xl mx-auto p-6 overflow-y-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-semibold text-text-primary mb-1">Cloud Sync Configuration</h1>
          <p class="text-sm text-text-secondary">Configure optional cloud sync for your mock services data</p>
        </div>

        <div class="bg-bg-secondary border border-border-default rounded-xl p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-base font-semibold text-text-primary">Enable Cloud Sync</h2>
              <p class="text-xs text-text-muted mt-1">Sync your mock services data to a remote server</p>
            </div>
            <button
              @click="settingsForm.enabled = !settingsForm.enabled"
              :class="[
                'relative w-12 h-6 rounded-full transition-colors duration-normal cursor-pointer',
                settingsForm.enabled ? 'bg-accent-green' : 'bg-bg-input'
              ]"
            >
              <span
                :class="[
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-normal shadow-sm',
                  settingsForm.enabled ? 'translate-x-6' : 'translate-x-0'
                ]"
              ></span>
            </button>
          </div>

          <p class="text-sm text-text-secondary mb-4">
            When enabled, your mock services data will be automatically synced to the configured cloud server.
            The application works fully offline - changes are stored locally and synced when online.
          </p>
        </div>

        <div v-if="settingsForm.enabled" class="space-y-6">
          <div class="bg-bg-secondary border border-border-default rounded-xl p-6">
            <h3 class="text-base font-semibold text-text-primary mb-4">Sync Server</h3>

            <div class="grid grid-cols-1 gap-4">
              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Server URL *</label>
                <input
                  v-model="settingsForm.serverUrl"
                  type="text"
                  placeholder="https://sync.example.com"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
                <p class="text-xs text-text-muted mt-1.5">URL of your self-hosted sync server</p>
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">API Key</label>
                <input
                  v-model="settingsForm.apiKey"
                  type="password"
                  placeholder="your-api-key"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
                <p class="text-xs text-text-muted mt-1.5">API key for authentication with the sync server</p>
              </div>
            </div>

            <div class="flex items-center gap-4 mt-4">
              <button
                @click="testConnection"
                :disabled="testConnectionStatus === 'testing' || !settingsForm.serverUrl"
                class="flex items-center gap-2 py-2 px-4 bg-bg-input text-text-secondary border border-border-default rounded-md cursor-pointer text-sm font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="testConnectionStatus === 'testing'" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                <svg v-else-if="testConnectionStatus === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-green">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <svg v-else-if="testConnectionStatus === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-red">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h6v6"></path>
                  <path d="M10 14 21 3"></path>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                </svg>
                {{ testConnectionStatus === 'testing' ? 'Testing...' : testConnectionStatus === 'success' ? 'Connected' : testConnectionStatus === 'error' ? 'Failed' : 'Test Connection' }}
              </button>
            </div>
          </div>

          <div class="bg-bg-secondary border border-border-default rounded-xl p-6">
            <h3 class="text-base font-semibold text-text-primary mb-4">Sync Options</h3>

            <div class="grid grid-cols-1 gap-4">
              <div class="mb-4">
                <div class="flex items-center justify-between mb-3">
                  <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide">Auto Sync</label>
                  <button
                    @click="settingsForm.autoSync = !settingsForm.autoSync"
                    :class="[
                      'relative w-10 h-5 rounded-full transition-colors duration-normal cursor-pointer',
                      settingsForm.autoSync ? 'bg-accent-green' : 'bg-bg-input'
                    ]"
                  >
                    <span
                      :class="[
                        'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-normal',
                        settingsForm.autoSync ? 'translate-x-5' : 'translate-x-0'
                      ]"
                    ></span>
                  </button>
                </div>
                <p class="text-xs text-text-muted">Automatically sync changes when online</p>
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Sync Interval</label>
                <select
                  v-model="settingsForm.syncInterval"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                >
                  <option :value="15">Every 15 seconds</option>
                  <option :value="30">Every 30 seconds</option>
                  <option :value="60">Every minute</option>
                  <option :value="300">Every 5 minutes</option>
                  <option :value="900">Every 15 minutes</option>
                </select>
                <p class="text-xs text-text-muted mt-1.5">How often to check for remote changes</p>
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Conflict Resolution</label>
                <select
                  v-model="settingsForm.conflictResolution"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                >
                  <option value="manual">Manual - Ask me what to do</option>
                  <option value="local">Prefer Local - Keep my changes</option>
                  <option value="remote">Prefer Remote - Use server version</option>
                </select>
                <p class="text-xs text-text-muted mt-1.5">How to handle conflicts when both local and remote changed</p>
              </div>
            </div>
          </div>

          <div v-if="saveStatus !== 'idle'" :class="['p-4 rounded-lg mb-4', saveStatus === 'success' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red']">
            {{ saveMessage }}
          </div>

          <div class="flex items-center gap-4">
            <button
              @click="saveSettings"
              :disabled="isLoading || !settingsForm.serverUrl"
              class="flex items-center gap-2 py-2.5 px-4 bg-accent-blue text-white rounded-md border-none cursor-pointer text-sm font-medium transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {{ isLoading ? 'Saving...' : 'Save Configuration' }}
            </button>
          </div>
        </div>

        <div v-if="settingsForm.enabled" class="mt-8">
          <div class="bg-bg-secondary border border-border-default rounded-xl p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-base font-semibold text-text-primary">Sync Status</h3>
              <button
                @click="triggerSync"
                :disabled="isSyncing"
                class="flex items-center gap-2 py-2 px-4 bg-accent-blue text-white rounded-md border-none cursor-pointer text-sm font-medium transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="isSyncing" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
              </button>
            </div>

            <div v-if="statusLoading" class="flex items-center justify-center py-8">
              <svg class="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
            </div>

            <div v-else-if="syncStatus" class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="p-4 bg-bg-tertiary rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="getStatusColor(syncStatus.status)">
                    <path v-html="getStatusIcon(syncStatus.status)"></path>
                  </svg>
                  <span class="text-xs font-medium text-text-muted uppercase">Status</span>
                </div>
                <span :class="['text-lg font-semibold capitalize', getStatusColor(syncStatus.status)]">
                  {{ syncStatus.status }}
                </span>
              </div>

              <div class="p-4 bg-bg-tertiary rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span class="text-xs font-medium text-text-muted uppercase">Last Sync</span>
                </div>
                <span class="text-lg font-semibold text-text-primary">
                  {{ formatDate(syncStatus.lastSyncAt) }}
                </span>
              </div>

              <div class="p-4 bg-bg-tertiary rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span class="text-xs font-medium text-text-muted uppercase">Pending</span>
                </div>
                <span class="text-lg font-semibold text-text-primary">
                  {{ syncStatus.pendingChanges }} changes
                </span>
              </div>

              <div class="p-4 bg-bg-tertiary rounded-lg">
                <div class="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="syncStatus.isOnline ? 'text-accent-green' : 'text-text-muted'">
                    <path v-html="getStatusIcon(syncStatus.isOnline ? 'idle' : 'error')"></path>
                  </svg>
                  <span class="text-xs font-medium text-text-muted uppercase">Connection</span>
                </div>
                <span :class="['text-lg font-semibold capitalize', syncStatus.isOnline ? 'text-accent-green' : 'text-text-muted']">
                  {{ syncStatus.isOnline ? 'Online' : 'Offline' }}
                </span>
              </div>
            </div>

            <div v-if="syncStatus?.errorMessage" class="mt-4 p-4 bg-accent-red/15 rounded-lg">
              <p class="text-sm text-accent-red">Error: {{ syncStatus.errorMessage }}</p>
            </div>
          </div>

          <div v-if="syncStatus?.conflicts && syncStatus.conflicts.length > 0" class="mt-6 bg-bg-secondary border border-border-default rounded-xl p-6">
            <h3 class="text-base font-semibold text-text-primary mb-4">Sync Conflicts</h3>
            <p class="text-sm text-text-secondary mb-4">
              The following items have conflicts between local and remote versions. Please resolve them.
            </p>

            <div class="space-y-3">
              <div v-for="conflict in syncStatus.conflicts" :key="conflict.id" class="p-4 bg-bg-tertiary rounded-lg">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <p class="text-sm font-medium text-text-primary">{{ conflict.type }}</p>
                    <p class="text-xs text-text-muted">ID: {{ conflict.id }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p class="text-xs text-text-muted mb-1">Local version</p>
                    <p class="text-xs text-text-primary">{{ formatDate(conflict.localUpdatedAt) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-text-muted mb-1">Remote version</p>
                    <p class="text-xs text-text-primary">{{ formatDate(conflict.remoteUpdatedAt) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="resolveConflict(conflict.id, 'local')"
                    class="flex-1 py-2 px-3 bg-bg-input text-text-secondary border border-border-default rounded-md cursor-pointer text-xs font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
                  >
                    Keep Local
                  </button>
                  <button
                    @click="resolveConflict(conflict.id, 'remote')"
                    class="flex-1 py-2 px-3 bg-bg-input text-text-secondary border border-border-default rounded-md cursor-pointer text-xs font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
                  >
                    Use Remote
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="bg-bg-secondary border border-border-default rounded-xl p-8 text-center">
          <div class="mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto text-text-muted opacity-30">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-2">Cloud Sync is Disabled</h3>
          <p class="text-sm text-text-secondary max-w-md mx-auto mb-4">
            Enable cloud sync above to sync your mock services data across devices and keep backups in the cloud.
          </p>
          <a
            href="/docs/self-hosted-sync"
            target="_blank"
            class="inline-flex items-center gap-2 py-2 px-4 bg-bg-input text-text-secondary border border-border-default rounded-md cursor-pointer text-sm font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Self-Hosted Sync Server Docs
          </a>
        </div>
      </div>
    </main>
  </div>
</template>
