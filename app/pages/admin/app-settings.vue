<script setup lang="ts">
import { useUpdaterState, checkForUpdates } from '~/composables/useUpdater';

const { state } = useUpdaterState();
const checking = ref(false);

const handleCheckNow = async () => {
  checking.value = true;
  await checkForUpdates();
  checking.value = false;
};

// Current app version from package.json
const appVersion = computed(() => {
  // In Tauri, this would come from the app metadata
  return '0.2.1';
});
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold text-text-primary mb-6">App Settings</h1>

    <!-- Update Section -->
    <div class="bg-bg-secondary border border-border-default rounded-xl p-6 mb-6">
      <div class="flex items-center gap-3 mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
          <path d="M12 2v8m0 0l3-3m-3 3l-3-3"/>
          <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/>
          <path d="M12 12v9"/>
        </svg>
        <h2 class="text-lg font-semibold text-text-primary">Updates</h2>
      </div>

      <div class="space-y-4">
        <!-- Current Version -->
        <div class="flex items-center justify-between py-3 px-4 bg-bg-primary rounded-lg">
          <div>
            <p class="text-sm text-text-secondary">Current Version</p>
            <p class="text-lg font-medium text-text-primary">{{ appVersion }}</p>
          </div>
          <button
            @click="handleCheckNow"
            :disabled="checking || state.checking"
            class="flex items-center gap-2 py-2 px-4 border border-border-default rounded-lg text-text-secondary hover:bg-bg-primary transition-colors disabled:opacity-50"
          >
            <svg
              v-if="checking || state.checking"
              class="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <svg
              v-else
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            <span>{{ checking || state.checking ? 'Checking...' : 'Check for Updates' }}</span>
          </button>
        </div>

        <!-- Update Available -->
        <div
          v-if="state.available"
          class="py-3 px-4 bg-accent-orange/10 border border-accent-orange/30 rounded-lg"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-accent-orange font-medium">Update Available</p>
              <p class="text-text-secondary">Version {{ state.info?.version }} is ready to install</p>
            </div>
            <button
              @click="$router.push('/admin')"
              class="py-2 px-4 bg-accent-orange text-white rounded-lg font-medium hover:bg-accent-orange/90 transition-colors"
            >
              View Update
            </button>
          </div>
        </div>

        <!-- No Updates -->
        <div
          v-else-if="state.info === null && !state.checking && !checking"
          class="py-3 px-4 bg-bg-primary rounded-lg"
        >
          <p class="text-text-secondary">You're up to date! No updates available.</p>
        </div>

        <!-- Error -->
        <div
          v-if="state.error"
          class="flex items-center gap-2 py-3 px-4 bg-accent-red/10 border border-accent-red/30 rounded-lg text-accent-red text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ state.error }}</span>
        </div>

        <!-- Auto-check setting -->
        <div class="flex items-center justify-between py-3 px-4 bg-bg-primary rounded-lg">
          <div>
            <p class="text-sm font-medium text-text-primary">Automatic Updates</p>
            <p class="text-xs text-text-secondary">Check for updates automatically on startup</p>
          </div>
          <div class="w-11 h-6 bg-accent-orange rounded-full relative">
            <div class="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"/>
          </div>
        </div>
      </div>
    </div>

    <!-- About Section -->
    <div class="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">About</h2>
      <div class="space-y-2 text-sm text-text-secondary">
        <p><strong class="text-text-primary">Mock Service</strong> - API Mocking and Testing Tool</p>
        <p>Version {{ appVersion }}</p>
        <p class="text-xs text-text-muted mt-4">
          Built with Nuxt.js, Tauri, and ❤️
        </p>
      </div>
    </div>
  </div>
</template>
