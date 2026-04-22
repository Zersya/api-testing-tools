<script setup lang="ts">
interface Props {
  show: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md'
});

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const sizeClasses = {
  sm: 'max-w-[320px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[800px]'
};

const sizeClass = computed(() => sizeClasses[props.size]);

const handleOverlayClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
    emit('close');
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div 
        v-if="show" 
        class="modal-overlay fixed inset-0 flex items-center justify-center z-[100] bg-black/75 backdrop-blur-[4px]" 
        @click="handleOverlayClick"
      >
        <div 
          :class="[
            'bg-bg-secondary border border-border-default rounded-xl shadow-modal w-[calc(100%-32px)] max-h-[90vh] overflow-hidden flex flex-col',
            sizeClass
          ]"
        >
          <!-- Header -->
          <div 
            v-if="title || $slots.header" 
            class="flex items-center justify-between py-4 px-5 border-b border-border-default flex-shrink-0"
          >
            <slot name="header">
              <h2 class="text-base font-semibold text-text-primary m-0">{{ title }}</h2>
            </slot>
            <button 
              class="text-text-secondary bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-all duration-fast hover:text-text-primary hover:bg-bg-hover" 
              @click="emit('close')" 
              aria-label="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-5 overflow-y-auto flex-1">
            <slot />
          </div>

          <!-- Footer -->
          <div 
            v-if="$slots.footer" 
            class="flex justify-end gap-2 py-4 px-5 border-t border-border-default flex-shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transition animations - kept as CSS for Vue transition support */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 200ms ease, opacity 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>
