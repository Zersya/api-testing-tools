<script setup lang="ts">
import { useUpdaterState, installUpdate } from '~/composables/useUpdater';

const { state, checkForUpdates } = useUpdaterState();
const showDialog = ref(false);
const installing = ref(false);
const error = ref('');

// Watch for available updates and show dialog
watch(() => state.available, (available) => {
  if (available) {
    showDialog.value = true;
  }
}, { immediate: false });

const handleInstall = async () => {
  installing.value = true;
  error.value = '';

  try {
    await installUpdate();
    // App will restart, no need to handle success
  } catch (e: any) {
    error.value = e.message || 'Failed to install update';
    installing.value = false;
  }
};

const handleDismiss = () => {
  showDialog.value = false;
};

const handleCheckNow = async () => {
  await checkForUpdates();
};
</script>

<template>
  <!-- Floating Update Button (shown when update is available but dialog is closed) -->
  <button
    v-if="state.available && !showDialog"
    @click="showDialog = true"
    class="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-accent-orange text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 animate-bounce"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v8m0 0l3-3m-3 3l-3-3"/>
      <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/>
      <path d="M12 12v9"/>
    </svg>
    <span class="font-medium">Update Available</span>
  </button>

  <!-- Update Dialog -->
  <Teleport to="body">
    <div
      v-if="showDialog"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click.self="handleDismiss"
    >
      <div class="bg-bg-secondary border border-border-default rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full bg-accent-orange/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
              <path d="M12 2v8m0 0l3-3m-3 3l-3-3"/>
              <path d="M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"/>
              <path d="M12 12v9"/>
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-text-primary">Update Available</h3>
            <p class="text-sm text-text-secondary">
              Version {{ state.info?.version }} is ready to install
            </p>
          </div>
        </div>

        <!-- Current vs New Version -->
        <div class="flex items-center justify-between py-3 px-4 bg-bg-primary rounded-lg mb-4">
          <div class="text-center">
            <p class="text-xs text-text-muted uppercase tracking-wide">Current</p>
            <p class="text-sm font-medium text-text-secondary">{{ state.info?.current_version }}</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <div class="text-center">
            <p class="text-xs text-text-muted uppercase tracking-wide">New</p>
            <p class="text-sm font-medium text-accent-orange">{{ state.info?.version }}</p>
          </div>
        </div>

        <!-- Release Notes -->
        <div class="mb-4">
          <p class="text-sm font-medium text-text-primary mb-2">What's New:</p>
          <div class="max-h-32 overflow-y-auto py-2 px-3 bg-bg-primary rounded-lg text-sm text-text-secondary whitespace-pre-wrap">
            {{ state.info?.body || 'No release notes available.' }}
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="error"
          class="flex items-center gap-2 py-2 px-3 bg-accent-red/10 border border-accent-red/30 rounded-lg mb-4 text-accent-red text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            @click="handleDismiss"
            :disabled="installing"
            class="flex-1 py-2.5 px-4 border border-border-default rounded-lg text-text-secondary font-medium hover:bg-bg-primary transition-colors disabled:opacity-50"
          >
            Later
          </button>
          <button
            @click="handleInstall"
            :disabled="installing"
            class="flex-1 py-2.5 px-4 bg-accent-orange text-white rounded-lg font-medium hover:bg-accent-orange/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg
              v-if="installing"
              class="animate-spin w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <span>{{ installing ? 'Installing...' : 'Update & Restart' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
