<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

interface Variable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  environmentId: string;
}

interface Environment {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  isMockEnvironment?: boolean;
  variables: Variable[];
}

interface Props {
  environments: Environment[];
  activeEnvironmentId: string | null;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const emit = defineEmits<{
  'update:activeEnvironmentId': [id: string | null];
  'manage': [];
  'create': [];
}>();

const isOpen = ref(false);
const dropdownRef = ref<HTMLDivElement | null>(null);

// Ensure environments is always an array
const safeEnvironments = computed(() => {
  return Array.isArray(props.environments) ? props.environments : [];
});

const activeEnvironment = computed(() => {
  return safeEnvironments.value.find(e => e.id === props.activeEnvironmentId) || null;
});

const sortedEnvironments = computed(() => {
  return [...safeEnvironments.value].sort((a, b) => {
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    return a.name.localeCompare(b.name);
  });
});

const getEnvironmentColor = (index: number, isMock?: boolean): string => {
  if (isMock) return '#8b5cf6'; // Purple for CLOUD MOCK
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
  return colors[index % colors.length];
};

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;
  }
};

const selectEnvironment = (environment: Environment) => {
  emit('update:activeEnvironmentId', environment.id);
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="relative" ref="dropdownRef">
    <button
      type="button"
      :disabled="disabled"
      @click="toggleDropdown"
      class="flex items-center gap-2 px-3 py-1.5 bg-bg-input border border-border-default rounded-lg text-xs font-medium text-text-primary hover:border-accent-blue/50 focus:outline-none focus:border-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      :class="{ 'border-accent-blue': isOpen }"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-text-muted"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>

      <span v-if="activeEnvironment" class="flex items-center gap-1.5">
        <template v-if="activeEnvironment.isMockEnvironment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3 0 1.7 1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/>
            <path d="M17.5 19c0-2.5-2-4.5-4.5-4.5h-7c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h7c2.5 0 4.5-2 4.5-4.5z"/>
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
          </svg>
          <span class="text-purple-400">{{ activeEnvironment.name }}</span>
        </template>
        <template v-else>
          <span
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: getEnvironmentColor(safeEnvironments.indexOf(activeEnvironment)) }"
          ></span>
          {{ activeEnvironment.name }}
        </template>
      </span>
      <span v-else class="flex items-center gap-1.5 text-accent-orange">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        No Environment
      </span>

      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        :class="{ 'rotate-180': isOpen }"
        class="text-text-muted transition-transform"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-1 w-56 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50 overflow-hidden"
      >
        <div class="py-1">
          <div v-if="safeEnvironments.length === 0" class="px-3 py-3 text-center">
            <p class="text-xs text-text-muted mb-2">No environments created yet</p>
            <button
              @click="emit('create'); isOpen = false"
              class="btn btn-primary w-full text-xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Environment
            </button>
          </div>

          <div
            v-for="environment in sortedEnvironments"
            :key="environment.id"
            @click="selectEnvironment(environment)"
            class="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
            :class="[
              activeEnvironmentId === environment.id
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            ]"
          >
            <template v-if="environment.isMockEnvironment">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
                <path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3 0 1.7 1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/>
                <path d="M17.5 19c0-2.5-2-4.5-4.5-4.5h-7c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h7c2.5 0 4.5-2 4.5-4.5z"/>
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              </svg>
            </template>
            <template v-else>
              <span
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: getEnvironmentColor(sortedEnvironments.indexOf(environment)) }"
              ></span>
            </template>
            <span class="flex-1 text-xs font-medium truncate" :class="{ 'text-purple-400': environment.isMockEnvironment }">{{ environment.name }}</span>
            <span class="text-[10px] text-text-muted">
              {{ environment.variables?.length || 0 }} vars
            </span>
            <svg
              v-if="activeEnvironmentId === environment.id"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-accent-blue"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>

          <div v-if="safeEnvironments.length > 0" class="border-t border-border-default my-1"></div>

          <button
            v-if="safeEnvironments.length > 0"
            @click="emit('create'); isOpen = false"
            class="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Environment
          </button>

          <button
            v-if="safeEnvironments.length > 0"
            @click="emit('manage'); isOpen = false"
            class="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Manage Environments
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
