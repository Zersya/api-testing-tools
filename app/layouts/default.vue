<script setup lang="ts">
// Initialize version checking
useVersion();

// Initialize auto-update checking (Tauri only)
import { initAutoUpdate } from '~/composables/useUpdater';
onMounted(() => {
  initAutoUpdate(24); // Check every 24 hours
});
</script>

<template>
  <div class="min-h-screen bg-bg-primary">
    <slot />
    <VersionNotification />
    <UpdateNotification />
  </div>
</template>
