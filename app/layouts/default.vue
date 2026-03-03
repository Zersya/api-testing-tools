<script setup lang="ts">
// Initialize version checking
useVersion();
</script>

<template>
  <div class="min-h-screen bg-bg-primary">
    <slot />
    <VersionNotification />
  </div>
</template>
