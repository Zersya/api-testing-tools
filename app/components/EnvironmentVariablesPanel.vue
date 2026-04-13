<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface Environment {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  isMockEnvironment?: boolean;
  createdAt: Date;
  variables: EnvironmentVariable[];
}

interface Props {
  show: boolean;
  environment: Environment | null;
  secretValues: Record<string, string>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  'update:variable': [variable: EnvironmentVariable, key: string, value: string, isSecret: boolean];
  'delete:variable': [variableId: string];
  'add:variable': [environmentId: string];
  'toggle:secret': [variable: EnvironmentVariable];
  activate: [environment: Environment];
}>();

const isClosing = ref(false);

const handleClose = () => {
  isClosing.value = true;
  setTimeout(() => {
    isClosing.value = false;
    emit('close');
  }, 200);
};

const handleOverlayClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains('slide-overlay')) {
    handleClose();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose();
  }
};

// Get actual value for secret variables
const getVariableValue = (variable: EnvironmentVariable): string => {
  if (variable.isSecret && props.secretValues[variable.id]) {
    return props.secretValues[variable.id];
  }
  return variable.value;
};

// Get environment color
const getEnvironmentColor = (isMock?: boolean): string => {
  if (isMock) return '#8b5cf6';
  return '#3b82f6';
};

watch(() => props.show, (show) => {
  if (show) {
    document.addEventListener('keydown', handleKeyDown);
  } else {
    document.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="slide">
      <div
        v-if="show"
        class="slide-overlay fixed inset-0 z-[100]"
        @click="handleOverlayClick"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity" @click="handleClose"></div>
        
        <!-- Panel -->
        <div
          :class="[
            'absolute right-0 top-0 h-full w-[480px] max-w-[90vw] bg-bg-secondary border-l border-border-default shadow-2xl flex flex-col transition-transform duration-200 ease-out',
            isClosing ? 'translate-x-full' : 'translate-x-0'
          ]"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between py-4 px-5 border-b border-border-default flex-shrink-0">
            <div class="flex items-center gap-3">
              <template v-if="environment?.isMockEnvironment">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3 0 1.7 1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/>
                  <path d="M17.5 19c0-2.5-2-4.5-4.5-4.5h-7c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h7c2.5 0 4.5-2 4.5-4.5z"/>
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                </svg>
              </template>
              <template v-else>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="environment?.isActive ? 'text-accent-green' : 'text-text-muted'">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </template>
              <div>
                <h2 class="text-base font-semibold text-text-primary">{{ environment?.name }}</h2>
                <div class="flex items-center gap-2 mt-0.5">
                  <span v-if="environment?.isMockEnvironment" class="text-[10px] text-purple-400 font-medium">Mock Environment</span>
                  <span v-else-if="environment?.isActive" class="text-[10px] text-accent-green font-medium">Active</span>
                  <span class="text-[10px] text-text-muted">{{ environment?.variables.length || 0 }} variables</span>
                </div>
              </div>
            </div>
            <button
              class="text-text-secondary bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded transition-all duration-fast hover:text-text-primary hover:bg-bg-hover"
              @click="handleClose"
              aria-label="Close panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Actions Bar -->
          <div class="flex items-center justify-between py-3 px-5 border-b border-border-default bg-bg-primary/50 flex-shrink-0">
            <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {{ environment?.variables.length || 0 }} Variable{{ (environment?.variables.length || 0) !== 1 ? 's' : '' }}
            </span>
            <div class="flex items-center gap-2">
              <button
                v-if="environment && !environment.isActive && !environment.isMockEnvironment"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-green bg-accent-green/10 border border-accent-green/30 rounded-lg transition-all duration-fast hover:bg-accent-green/20"
                @click="environment && emit('activate', environment)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Activate
              </button>
              <button
                v-if="environment"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-blue bg-accent-blue/10 border border-accent-blue/30 rounded-lg transition-all duration-fast hover:bg-accent-blue/20"
                @click="environment && emit('add:variable', environment.id)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Variable
              </button>
            </div>
          </div>

          <!-- Variables List -->
          <div class="flex-1 overflow-y-auto p-5">
            <div v-if="!environment?.variables.length" class="flex flex-col items-center justify-center h-full text-center">
              <div class="w-16 h-16 mb-4 rounded-full bg-bg-input flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <p class="text-sm text-text-secondary mb-3">No variables defined</p>
              <button
                v-if="environment"
                class="btn btn-primary btn-sm"
                @click="emit('add:variable', environment.id)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add First Variable
              </button>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="variable in environment?.variables"
                :key="variable.id"
                class="group bg-bg-input border border-border-default rounded-lg p-3 transition-all duration-fast hover:border-border-hover"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-1 space-y-2">
                    <input
                      v-model="variable.key"
                      @blur="emit('update:variable', variable, variable.key, getVariableValue(variable), variable.isSecret)"
                      @keyup.enter="($event.target as HTMLInputElement).blur()"
                      class="w-full py-1.5 px-2 bg-bg-primary border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                      placeholder="Variable name"
                    />
                    <div class="flex items-center gap-2">
                      <input
                        :key="`input-${variable.id}-${variable.isSecret ? 'secret' : 'text'}`"
                        :value="getVariableValue(variable)"
                        @blur="emit('update:variable', variable, variable.key, ($event.target as HTMLInputElement).value, variable.isSecret)"
                        @keyup.enter="($event.target as HTMLInputElement).blur()"
                        :type="variable.isSecret ? 'password' : 'text'"
                        class="flex-1 py-1.5 px-2 bg-bg-primary border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                        placeholder="Variable value"
                      />
                      <button
                        @click="emit('toggle:secret', variable)"
                        :class="[
                          'flex items-center justify-center w-8 h-8 border-none rounded cursor-pointer transition-all duration-fast shrink-0',
                          variable.isSecret ? 'bg-accent-yellow/15 text-accent-yellow hover:bg-accent-yellow/25' : 'bg-bg-hover text-text-muted hover:text-text-primary'
                        ]"
                        :title="variable.isSecret ? 'Secret (click to reveal)' : 'Not secret (click to hide)'"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <button
                    @click="emit('delete:variable', variable.id)"
                    class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-red opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete variable"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 200ms ease;
}

.slide-enter-active > div:last-child,
.slide-leave-active > div:last-child {
  transition: transform 200ms ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from > div:last-child,
.slide-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
