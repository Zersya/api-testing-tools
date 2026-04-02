<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  'update:hideForever': [value: boolean];
}>();

const hideForever = ref(false);

const onConfirm = () => {
  emit('confirm');
  if (hideForever.value) {
    emit('update:hideForever', true);
  }
};

const onCancel = () => {
  emit('cancel');
};

// Reset hideForever when dialog opens
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    hideForever.value = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        @click.self="onCancel"
      >
        <div class="bg-bg-secondary border border-border-default rounded-lg shadow-xl max-w-md w-full overflow-hidden">
          <!-- Header with Warning Icon -->
          <div class="p-5 border-b border-border-default">
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-text-primary">
                  Save to Shared Collection?
                </h3>
                <p class="text-sm text-text-secondary mt-1">
                  This action will affect all team members
                </p>
              </div>
            </div>
          </div>

          <!-- Warning Message -->
          <div class="p-5 space-y-4">
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-500 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div class="text-sm text-text-primary space-y-2">
                  <p class="font-medium">You are saving to a shared collection.</p>
                  <p class="text-text-secondary">
                    This request will be visible to <span class="text-amber-500 font-semibold">all team members</span> who have access to this workspace.
                  </p>
                  <p class="text-accent-red font-medium">
                    Make sure no sensitive data (API keys, tokens, passwords, secrets) is included in headers, body, or authentication fields.
                  </p>
                </div>
              </div>
            </div>

            <!-- Don't Show Again Checkbox -->
            <label class="flex items-center gap-3 cursor-pointer group">
              <div class="relative">
                <input 
                  type="checkbox" 
                  v-model="hideForever"
                  class="peer sr-only"
                >
                <div class="w-5 h-5 border-2 border-border-default rounded bg-bg-tertiary peer-checked:bg-accent-blue peer-checked:border-accent-blue transition-all"></div>
                <svg 
                  v-if="hideForever"
                  class="absolute inset-0 w-5 h-5 text-white p-0.5" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="3"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span class="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                Don't show this warning again
              </span>
            </label>
          </div>

          <!-- Actions -->
          <div class="p-5 border-t border-border-default bg-bg-tertiary flex items-center justify-end gap-3">
            <button
              @click="onCancel"
              class="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-input border border-border-default rounded-md hover:bg-bg-hover hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              @click="onConfirm"
              class="px-4 py-2 text-sm font-medium text-white bg-accent-blue border border-transparent rounded-md hover:bg-accent-blue/90 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Continue to Save
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
