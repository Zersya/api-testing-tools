<script setup lang="ts">
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
  environment: Environment;
  isSelected?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [environment: Environment];
  activate: [environment: Environment];
  rename: [environment: Environment];
  duplicate: [environment: Environment];
  delete: [environment: Environment];
}>();

const getEnvironmentColor = (isMock?: boolean): string => {
  if (isMock) return '#8b5cf6';
  return '#3b82f6';
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(date));
};
</script>

<template>
  <div
    :class="[
      'group flex items-center gap-4 p-3 rounded-lg border transition-all duration-fast cursor-pointer',
      isSelected
        ? 'bg-accent-blue/10 border-accent-blue/50'
        : 'bg-bg-input border-border-default hover:border-border-hover hover:bg-bg-hover'
    ]"
    @click="emit('click', environment)"
  >
    <!-- Icon -->
    <div class="flex-shrink-0">
      <template v-if="environment.isMockEnvironment">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3 0 1.7 1.3 3 3 3h11c1.7 0 3-1.3 3-3z"/>
          <path d="M17.5 19c0-2.5-2-4.5-4.5-4.5h-7c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h7c2.5 0 4.5-2 4.5-4.5z"/>
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
      </template>
      <template v-else>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="environment.isActive ? 'text-accent-green' : 'text-text-muted'">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      </template>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-medium truncate" :class="environment.isMockEnvironment ? 'text-purple-400' : 'text-text-primary'">
          {{ environment.name }}
        </h3>
        <span v-if="environment.isMockEnvironment" class="px-1.5 py-0.5 bg-purple-500/15 text-purple-400 text-[10px] font-semibold uppercase rounded-full">Mock</span>
        <span v-else-if="environment.isActive" class="px-1.5 py-0.5 bg-accent-green/15 text-accent-green text-[10px] font-semibold uppercase rounded-full">Active</span>
      </div>
      <div class="flex items-center gap-3 mt-0.5">
        <span class="text-xs text-text-muted">{{ environment.variables.length }} variable{{ environment.variables.length !== 1 ? 's' : '' }}</span>
        <span class="text-xs text-text-muted">•</span>
        <span class="text-xs text-text-muted">{{ formatDate(environment.createdAt) }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
      <button
        v-if="!environment.isActive && !environment.isMockEnvironment"
        class="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-accent-green hover:bg-accent-green/10 transition-all duration-fast"
        @click="emit('activate', environment)"
        title="Activate"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
      <button
        v-if="!environment.isMockEnvironment"
        class="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-fast"
        @click="emit('rename', environment)"
        title="Rename"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
        </svg>
      </button>
      <button
        v-if="!environment.isMockEnvironment"
        class="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all duration-fast"
        @click="emit('duplicate', environment)"
        title="Duplicate"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <button
        v-if="!environment.isMockEnvironment"
        class="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-all duration-fast"
        @click="emit('delete', environment)"
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>
