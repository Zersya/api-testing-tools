<template>
  <div class="min-h-screen bg-bg-primary">
    <AppHeader />
    
    <div class="flex">
      <AppSidebar />
      
      <main class="flex-1 ml-64 p-8">
        <div class="max-w-2xl">
          <h1 class="text-2xl font-bold text-text-primary mb-6">Settings</h1>
          
          <div class="bg-bg-secondary border border-border-primary rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold text-text-primary mb-4">Server Configuration</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-text-secondary mb-2">
                  Server URL
                </label>
                <input 
                  v-model="serverUrl"
                  type="url"
                  placeholder="https://api.mockservice.com"
                  class="w-full px-4 py-2.5 bg-bg-primary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                />
                <p class="mt-1 text-xs text-text-muted">
                  The backend server URL for sync and API operations
                </p>
              </div>
            </div>
          </div>
          
          <div class="bg-bg-secondary border border-border-primary rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold text-text-primary mb-4">Sync Settings</h2>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-text-primary">Auto Sync</p>
                  <p class="text-sm text-text-muted">Automatically sync changes in the background</p>
                </div>
                <button 
                  @click="autoSync = !autoSync"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    autoSync ? 'bg-accent-blue' : 'bg-bg-tertiary'
                  ]"
                >
                  <span 
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      autoSync ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
              
              <div v-if="autoSync">
                <label class="block text-sm font-medium text-text-secondary mb-2">
                  Sync Interval (minutes)
                </label>
                <select 
                  v-model="syncInterval"
                  class="w-full px-4 py-2.5 bg-bg-primary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all"
                >
                  <option :value="1">Every 1 minute</option>
                  <option :value="5">Every 5 minutes</option>
                  <option :value="15">Every 15 minutes</option>
                  <option :value="30">Every 30 minutes</option>
                  <option :value="60">Every hour</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="bg-bg-secondary border border-border-primary rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold text-text-primary mb-4">Sync Status</h2>
            
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-text-secondary">Pending Changes</span>
                <span class="font-mono text-accent-yellow">{{ pendingChanges }}</span>
              </div>
              
              <div class="flex items-center justify-between">
                <span class="text-text-secondary">Last Sync</span>
                <span class="text-text-muted">{{ lastSyncText }}</span>
              </div>
              
              <button 
                @click="handleSync"
                :disabled="isSyncing"
                class="w-full py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                <svg v-if="isSyncing" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
              </button>
            </div>
          </div>
          
          <div class="bg-bg-secondary border border-border-primary rounded-xl p-6">
            <h2 class="text-lg font-semibold text-text-primary mb-4">Account</h2>
            
            <div class="space-y-4">
              <div v-if="currentUser" class="flex items-center gap-4">
                <div class="w-12 h-12 bg-accent-blue/10 rounded-full flex items-center justify-center">
                  <span class="text-accent-blue font-semibold text-lg">{{ currentUser.email?.charAt(0).toUpperCase() }}</span>
                </div>
                <div>
                  <p class="font-medium text-text-primary">{{ currentUser.name || 'Administrator' }}</p>
                  <p class="text-sm text-text-muted">{{ currentUser.email }}</p>
                </div>
              </div>
              
              <button 
                @click="handleLogout"
                class="w-full py-2.5 border border-border-primary text-text-secondary rounded-lg hover:bg-bg-tertiary hover:text-text-primary transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end gap-3">
            <button 
              @click="handleSave"
              :disabled="saving"
              class="px-6 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 transition-colors font-medium"
            >
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </button>
          </div>
        </div>
      </main>
    </div>
    
    <SyncResultsModal 
      :is-open="showSyncResults" 
      :result="syncResult!"
      @close="showSyncResults = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import AppHeader from '~/components/AppHeader.vue';
import AppSidebar from '~/components/AppSidebar.vue';
import SyncResultsModal from '~/components/sync/SyncResultsModal.vue';
import { useAuth } from '~/composables/useAuth';
import { useSync } from '~/composables/useSync';
import type { DesktopSyncResult } from '~/composables/useSync';

definePageMeta({
  middleware: 'auth'
});

const { currentUser, logout } = useAuth();
const { isSyncing, pendingChanges, triggerSync, saveConfig, fetchStatus } = useSync();

const serverUrl = ref('http://localhost:3000');
const autoSync = ref(true);
const syncInterval = ref(5);
const saving = ref(false);
const showSyncResults = ref(false);
const syncResult = ref<DesktopSyncResult | null>(null);

const lastSyncText = computed(() => {
  return 'Never';
});

async function handleSave() {
  saving.value = true;
  try {
    await saveConfig({
      serverUrl: serverUrl.value,
      autoSync: autoSync.value,
      syncInterval: syncInterval.value,
      enabled: true
    });
    alert('Settings saved successfully');
  } catch (error) {
    alert('Failed to save settings');
  } finally {
    saving.value = false;
  }
}

async function handleSync() {
  try {
    const result = await triggerSync();
    syncResult.value = result;
    showSyncResults.value = true;
  } catch (error) {
    alert('Sync failed: ' + (error as Error).message);
  }
}

async function handleLogout() {
  await logout();
  navigateTo('/login');
}

onMounted(async () => {
  try {
    const { getSettings } = await import('~/services/settings');
    const settings = await getSettings();
    serverUrl.value = settings.serverUrl;
    autoSync.value = settings.autoSync;
    syncInterval.value = settings.syncInterval;
    await fetchStatus();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
});
</script>
