# Refactor "Manage Environments" to Searchable List Layout

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the existing card grid with a hybrid Grid/List view that includes search (by environment name AND variables), sorting, and a slide-out panel for variable editing.

**Architecture:** Create a new `EnvironmentManager.vue` component with view toggle (Grid/List), search filtering, sorting controls, and a slide-out panel for variable management. The component will be integrated into the existing admin index page's environment settings section.

**Tech Stack:** Vue 3, Nuxt 3, Tailwind CSS, existing project design system

---

## Overview

The current "Manage Environments" view (lines 3064-3234 in `/app/pages/admin/index.vue`) uses a card grid layout (`grid-cols-1 lg:grid-cols-2`). This plan refactors it to:

1. **View Toggle**: Switch between Grid and List views
2. **Search**: Filter environments by name AND variable keys/values
3. **Sorting**: Sort by name, created date, variable count, or status
4. **Slide-out Panel**: Click any environment to open a side panel for variable editing

---

## Files to Create/Modify

### New Components to Create
1. `app/components/EnvironmentManager.vue` - Main container component
2. `app/components/EnvironmentListItem.vue` - List row component
3. `app/components/EnvironmentVariablesPanel.vue` - Slide-out panel for variable editing
4. `app/components/ViewToggle.vue` - Grid/List toggle button (reusable)

### Files to Modify
1. `app/pages/admin/index.vue` - Replace environment settings section (lines 3064-3234)

---

## Implementation Tasks

### Task 1: Create ViewToggle Component

**Files:**
- Create: `app/components/ViewToggle.vue`

**Purpose:** Reusable toggle button for switching between Grid and List views

**Implementation:**

```vue
<script setup lang="ts">
interface Props {
  modelValue: 'grid' | 'list';
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: 'grid' | 'list'];
}>();

const toggleView = (view: 'grid' | 'list') => {
  emit('update:modelValue', view);
};
</script>

<template>
  <div class="flex items-center gap-1 bg-bg-input border border-border-default rounded-lg p-1">
    <button
      type="button"
      :class="[
        'flex items-center justify-center w-8 h-7 rounded transition-all duration-fast',
        modelValue === 'grid'
          ? 'bg-bg-secondary text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-primary'
      ]"
      @click="toggleView('grid')"
      title="Grid view"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    </button>
    <button
      type="button"
      :class="[
        'flex items-center justify-center w-8 h-7 rounded transition-all duration-fast',
        modelValue === 'list'
          ? 'bg-bg-secondary text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-primary'
      ]"
      @click="toggleView('list')"
      title="List view"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"></line>
        <line x1="8" y1="12" x2="21" y2="12"></line>
        <line x1="8" y1="18" x2="21" y2="18"></line>
        <line x1="3" y1="6" x2="3.01" y2="6"></line>
        <line x1="3" y1="12" x2="3.01" y2="12"></line>
        <line x1="3" y1="18" x2="3.01" y2="18"></line>
      </svg>
    </button>
  </div>
</template>
```

**Testing:**
- Verify toggle switches between grid and list icons
- Verify active state styling is applied correctly

---

### Task 2: Create EnvironmentVariablesPanel Component

**Files:**
- Create: `app/components/EnvironmentVariablesPanel.vue`

**Purpose:** Slide-out panel for editing environment variables

**Props/Emits:**
- `show: boolean` - Controls visibility
- `environment: Environment | null` - Selected environment data
- `@close` - Emitted when panel should close
- `@update:variable` - Emitted when variable is updated
- `@delete:variable` - Emitted when variable is deleted
- `@add:variable` - Emitted when adding new variable
- `@toggle:secret` - Emitted when toggling secret status

**Implementation:**

```vue
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
        <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"></div>
        
        <!-- Panel -->
        <div
          :class="[
            'absolute right-0 top-0 h-full w-[480px] max-w-[90vw] bg-bg-secondary border-l border-border-default shadow-2xl flex flex-col transition-transform duration-200 ease-out',
            isClosing ? 'translate-x-full' : 'translate-x-0'
          ]"
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
                      :value="variable.key"
                      @blur="emit('update:variable', variable, ($event.target as HTMLInputElement).value, getVariableValue(variable), variable.isSecret)"
                      @keyup.enter="($event.target as HTMLInputElement).blur()"
                      class="w-full py-1.5 px-2 bg-bg-primary border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                      placeholder="Variable name"
                    />
                    <div class="flex items-center gap-2">
                      <input
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
```

**Testing:**
- Verify panel slides in from right
- Verify clicking overlay or pressing Escape closes panel
- Verify variable inputs work correctly
- Verify activate/add/delete/toggle actions emit correct events

---

### Task 3: Create EnvironmentListItem Component

**Files:**
- Create: `app/components/EnvironmentListItem.vue`

**Purpose:** Individual row for the list view

```vue
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
```

**Testing:**
- Verify click event opens panel
- Verify hover shows action buttons
- Verify all action buttons emit correct events
- Verify selected state styling

---

### Task 4: Create EnvironmentManager Component

**Files:**
- Create: `app/components/EnvironmentManager.vue`

**Purpose:** Main container with search, sort, view toggle, and environment display

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ViewToggle from './ViewToggle.vue';
import EnvironmentListItem from './EnvironmentListItem.vue';
import EnvironmentVariablesPanel from './EnvironmentVariablesPanel.vue';
import Modal from './Modal.vue';

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

type SortOption = 'name' | 'created' | 'variables' | 'status';
type ViewMode = 'grid' | 'list';

interface Props {
  environments: Environment[];
  projectId: string | null;
  isLoading?: boolean;
  secretValues?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  secretValues: () => ({})
});

const emit = defineEmits<{
  create: [];
  'update:environment': [];
  activate: [environment: Environment];
  rename: [environment: Environment, newName: string];
  duplicate: [environment: Environment];
  delete: [environment: Environment];
  'update:variable': [variable: EnvironmentVariable, key: string, value: string, isSecret: boolean];
  'delete:variable': [variableId: string];
  'add:variable': [environmentId: string];
  'toggle:secret': [variable: EnvironmentVariable];
}>();

// State
const viewMode = ref<ViewMode>('list');
const searchQuery = ref('');
const sortBy = ref<SortOption>('name');
const selectedEnvironment = ref<Environment | null>(null);
const showVariablesPanel = ref(false);

// Modal states (managed internally for rename/delete)
const showRenameModal = ref(false);
const showDeleteModal = ref(false);
const environmentToRename = ref<Environment | null>(null);
const environmentToDelete = ref<Environment | null>(null);
const renameForm = ref({ name: '' });

// Search and filter
const filteredEnvironments = computed(() => {
  let result = [...props.environments];
  
  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim();
    result = result.filter(env => {
      // Search by environment name
      if (env.name.toLowerCase().includes(query)) return true;
      
      // Search by variable keys and values
      return env.variables.some(v => 
        v.key.toLowerCase().includes(query) || 
        v.value.toLowerCase().includes(query)
      );
    });
  }
  
  // Sort
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'variables':
        return b.variables.length - a.variables.length;
      case 'status':
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        if (a.isMockEnvironment && !b.isMockEnvironment) return -1;
        if (!a.isMockEnvironment && b.isMockEnvironment) return 1;
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });
  
  return result;
});

const hasSearchResults = computed(() => filteredEnvironments.value.length > 0);

// Actions
const openVariablesPanel = (environment: Environment) => {
  selectedEnvironment.value = environment;
  showVariablesPanel.value = true;
};

const closeVariablesPanel = () => {
  showVariablesPanel.value = false;
  setTimeout(() => {
    selectedEnvironment.value = null;
  }, 200);
};

const handleActivate = (environment: Environment) => {
  emit('activate', environment);
};

const handleRenameClick = (environment: Environment) => {
  environmentToRename.value = environment;
  renameForm.value.name = environment.name;
  showRenameModal.value = true;
};

const confirmRename = () => {
  if (environmentToRename.value && renameForm.value.name.trim()) {
    emit('rename', environmentToRename.value, renameForm.value.name.trim());
    showRenameModal.value = false;
    environmentToRename.value = null;
  }
};

const handleDeleteClick = (environment: Environment) => {
  environmentToDelete.value = environment;
  showDeleteModal.value = true;
};

const confirmDelete = () => {
  if (environmentToDelete.value) {
    emit('delete', environmentToDelete.value);
    showDeleteModal.value = false;
    environmentToDelete.value = null;
  }
};

const handleDuplicate = (environment: Environment) => {
  emit('duplicate', environment);
};

const getEnvironmentColor = (index: number, isMock?: boolean): string => {
  if (isMock) return '#8b5cf6';
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
  return colors[index % colors.length];
};

const clearSearch = () => {
  searchQuery.value = '';
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-border-default">
      <div class="flex items-center gap-3 flex-1">
        <!-- Search -->
        <div class="relative flex-1 max-w-md">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="2" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search environments and variables..."
            class="w-full py-2 pl-10 pr-9 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <!-- Sort Dropdown -->
        <select
          v-model="sortBy"
          class="py-2 px-3 bg-bg-input border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
        >
          <option value="name">Sort by Name</option>
          <option value="created">Sort by Created</option>
          <option value="variables">Sort by Variables</option>
          <option value="status">Sort by Status</option>
        </select>
      </div>

      <div class="flex items-center gap-3">
        <!-- View Toggle -->
        <ViewToggle v-model="viewMode" />
        
        <!-- Create Button -->
        <button
          class="btn btn-primary btn-sm"
          @click="emit('create')"
          :disabled="!projectId"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Environment
        </button>
      </div>
    </div>

    <!-- Results Count -->
    <div v-if="searchQuery" class="mb-3 text-xs text-text-muted">
      {{ filteredEnvironments.length }} result{{ filteredEnvironments.length !== 1 ? 's' : '' }} for "{{ searchQuery }}"
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="flex items-center gap-2 text-text-muted">
        <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
        Loading environments...
      </div>
    </div>

    <!-- Empty States -->
    <div v-else-if="environments.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div class="w-16 h-16 mb-4 rounded-full bg-bg-input flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-text-primary mb-2">No environments yet</h3>
      <p class="text-text-secondary mb-4 max-w-sm">Create your first environment for development, staging, or production variables.</p>
      <button class="btn btn-primary" @click="emit('create')" :disabled="!projectId">
        Create Environment
      </button>
    </div>

    <div v-else-if="!hasSearchResults" class="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div class="w-16 h-16 mb-4 rounded-full bg-bg-input flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
      <h3 class="text-base font-semibold text-text-primary mb-1">No results found</h3>
      <p class="text-text-secondary mb-3">No environments or variables match "{{ searchQuery }}"</p>
      <button class="btn btn-secondary btn-sm" @click="clearSearch">
        Clear Search
      </button>
    </div>

    <!-- Content -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- List View -->
      <div v-if="viewMode === 'list'" class="space-y-2">
        <EnvironmentListItem
          v-for="environment in filteredEnvironments"
          :key="environment.id"
          :environment="environment"
          :is-selected="selectedEnvironment?.id === environment.id"
          @click="openVariablesPanel"
          @activate="handleActivate"
          @rename="handleRenameClick"
          @duplicate="handleDuplicate"
          @delete="handleDeleteClick"
        />
      </div>

      <!-- Grid View (Original Card Layout) -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 content-start">
        <div
          v-for="(environment, index) in filteredEnvironments"
          :key="environment.id"
          class="bg-bg-secondary border border-border-default rounded-xl overflow-hidden flex flex-col max-h-[500px]"
        >
          <!-- Card Header -->
          <div class="p-4 border-b border-border-default">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2.5">
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
                  <h3 class="text-sm font-semibold" :class="environment.isMockEnvironment ? 'text-purple-400' : 'text-text-primary'">{{ environment.name }}</h3>
                </div>
                <span v-if="environment.isMockEnvironment" class="py-0.5 px-2 bg-purple-500/15 text-purple-400 text-[10px] font-semibold uppercase rounded-full">Mock</span>
                <span v-else-if="environment.isActive" class="py-0.5 px-2 bg-accent-green/15 text-accent-green text-[10px] font-semibold uppercase rounded-full">Active</span>
              </div>
              <div class="flex items-center gap-1">
                <button v-if="!environment.isActive && !environment.isMockEnvironment" class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-green" @click="handleActivate(environment)" title="Activate">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
                <button v-if="!environment.isMockEnvironment" class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" @click="handleRenameClick(environment)" title="Rename">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                  </svg>
                </button>
                <button v-if="!environment.isMockEnvironment" class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" @click="handleDuplicate(environment)" title="Duplicate">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button v-if="!environment.isMockEnvironment" class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-red" @click="handleDeleteClick(environment)" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Card Variables -->
          <div class="p-4 flex flex-col flex-1 min-h-0">
            <div class="flex items-center justify-between mb-3 shrink-0">
              <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ environment.variables.length }} Variable{{ environment.variables.length !== 1 ? 's' : '' }}</span>
              <button class="flex items-center gap-1 text-xs font-medium text-accent-blue border-none bg-transparent cursor-pointer transition-all duration-fast hover:text-accent-blue/80" @click="openVariablesPanel(environment)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Variable
              </button>
            </div>

            <div v-if="environment.variables.length === 0" class="py-8 text-center shrink-0">
              <p class="text-xs text-text-muted">No variables defined for this environment</p>
            </div>

            <div v-else class="space-y-2 overflow-y-auto">
              <div v-for="variable in environment.variables" :key="variable.id" class="flex items-center gap-2 group">
                <input
                  :value="variable.key"
                  @blur="emit('update:variable', variable, ($event.target as HTMLInputElement).value, variable.value, variable.isSecret)"
                  @keyup.enter="($event.target as HTMLInputElement).blur()"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                  placeholder="Variable name"
                />
                <div class="flex-1 flex items-center gap-2">
                  <input
                    :value="variable.value"
                    @blur="emit('update:variable', variable, variable.key, ($event.target as HTMLInputElement).value, variable.isSecret)"
                    @keyup.enter="($event.target as HTMLInputElement).blur()"
                    :type="variable.isSecret ? 'password' : 'text'"
                    class="w-full py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                    placeholder="Variable value"
                  />
                  <button
                    @click="emit('toggle:secret', variable)"
                    :class="[
                      'flex items-center justify-center w-8 h-8 border-none rounded cursor-pointer transition-all duration-fast',
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
                <button
                  @click="emit('delete:variable', variable.id)"
                  class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-red opacity-0 group-hover:opacity-100"
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

    <!-- Variables Slide-out Panel -->
    <EnvironmentVariablesPanel
      :show="showVariablesPanel"
      :environment="selectedEnvironment"
      :secret-values="secretValues"
      @close="closeVariablesPanel"
      @activate="handleActivate"
      @add:variable="emit('add:variable', $event)"
      @update:variable="emit('update:variable', $event)"
      @delete:variable="emit('delete:variable', $event)"
      @toggle:secret="emit('toggle:secret', $event)"
    />

    <!-- Rename Modal -->
    <Modal
      :show="showRenameModal"
      title="Rename Environment"
      size="sm"
      @close="showRenameModal = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Environment Name</label>
          <input
            v-model="renameForm.name"
            type="text"
            class="w-full py-2 px-3 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
            placeholder="Enter environment name"
            @keyup.enter="confirmRename"
          />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showRenameModal = false">Cancel</button>
        <button class="btn btn-primary" @click="confirmRename" :disabled="!renameForm.name.trim()">Rename</button>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal
      :show="showDeleteModal"
      title="Delete Environment"
      size="sm"
      @close="showDeleteModal = false"
    >
      <p class="text-sm text-text-secondary">
        Are you sure you want to delete <strong class="text-text-primary">{{ environmentToDelete?.name }}</strong>? This action cannot be undone.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteModal = false">Cancel</button>
        <button class="btn btn-danger" @click="confirmDelete">Delete</button>
      </template>
    </Modal>
  </div>
</template>
```

**Testing:**
- Verify view toggle works
- Verify search filters by name and variables
- Verify sorting options work correctly
- Verify clicking list item opens panel
- Verify all CRUD operations emit correct events

---

### Task 5: Modify Admin Index Page

**Files:**
- Modify: `/Users/zeinersyad/Playground/worktrees/three-otters-nail-9g1/app/pages/admin/index.vue` lines 3064-3234

**Purpose:** Replace the existing environment settings section with the new EnvironmentManager component

**Changes:**

Replace the entire environment settings section (lines 3064-3234) with:

```vue
        <!-- Environment Settings Panel -->
        <div v-show="hasWorkspaces && activeAdminPanel === 'environments'" class="h-full flex flex-col p-6 overflow-hidden">
          <div class="flex items-center justify-between mb-6 gap-4">
            <div class="flex items-center gap-3">
              <button class="btn btn-secondary" @click="closeEnvironmentSettings">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Requests
              </button>
              <div>
                <h2 class="text-xl font-semibold text-text-primary">Environment Settings</h2>
                <p class="text-sm text-text-secondary">Manage environment variables without leaving current tabs</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <select
                v-model="selectedWorkspaceId"
                @change="selectedProjectId = currentWorkspace?.projects?.[0]?.id || null"
                class="py-2 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              >
                <option v-for="workspace in workspaces || []" :key="workspace.id" :value="workspace.id">
                  {{ workspace.name }}
                </option>
              </select>
              <select
                v-if="currentWorkspace?.projects?.length > 0"
                v-model="selectedProjectId"
                class="py-2 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              >
                <option v-for="project in currentWorkspace?.projects || []" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="!currentProjectId" class="flex-1 flex items-center justify-center text-text-muted text-sm text-center">
            Select a workspace and project to manage environments.
          </div>

          <EnvironmentManager
            v-else
            :environments="environmentSettingsEnvironments"
            :project-id="currentProjectId"
            :is-loading="isEnvironmentSettingsLoading"
            :secret-values="environmentSettingsSecretValues"
            @create="openEnvironmentCreateModal"
            @activate="activateEnvironmentFromSettings"
            @rename="(env, name) => { environmentToRename.value = env; environmentRenameForm.value.name = name; showEnvironmentRenameModal.value = true; }"
            @duplicate="(env) => { environmentToDuplicate.value = env; showEnvironmentDuplicateConfirm.value = true; }"
            @delete="(env) => { environmentToDelete.value = env; showEnvironmentDeleteConfirm.value = true; }"
            @add:variable="addVariableFromSettings"
            @update:variable="updateVariableFromSettings"
            @delete:variable="deleteVariableFromSettings"
            @toggle:secret="toggleSecretFromSettings"
          />
        </div>
```

**Add Import:**
At the top of the script section (around line 15), add:
```typescript
import EnvironmentManager from '~/components/EnvironmentManager.vue';
```

**Delete Old Code:**
Remove the old environment settings template code from lines 3064-3234 (the entire `div` with environment cards grid).

**Keep the Modals:**
Keep the existing modals at the bottom of the file (lines ~3800-3900):
- Create Environment Modal
- Rename Environment Modal  
- Delete Environment Modal
- Duplicate Environment Modal

These are still needed as they're triggered from the EnvironmentManager component.

---

### Task 6: Testing & Verification

**Manual Testing Checklist:**

1. **View Toggle**
   - [ ] Click Grid icon → displays card grid layout
   - [ ] Click List icon → displays list layout
   - [ ] Active toggle state is visually distinct

2. **Search Functionality**
   - [ ] Search by environment name → filters correctly
   - [ ] Search by variable key → shows environments with matching variables
   - [ ] Search by variable value → shows environments with matching values
   - [ ] Clear search button works
   - [ ] "No results" state displays correctly

3. **Sorting**
   - [ ] Sort by Name → alphabetical order
   - [ ] Sort by Created → newest first
   - [ ] Sort by Variables → most variables first
   - [ ] Sort by Status → Active/Mock first

4. **List View Interactions**
   - [ ] Hover over list item shows action buttons
   - [ ] Click list item opens slide-out panel
   - [ ] Activate button works from list
   - [ ] Rename button opens modal
   - [ ] Duplicate button triggers duplicate
   - [ ] Delete button opens confirmation

5. **Grid View (Legacy)**
   - [ ] Card layout displays correctly
   - [ ] Inline variable editing still works
   - [ ] All action buttons functional

6. **Slide-out Panel**
   - [ ] Panel slides in from right
   - [ ] Shows correct environment name and info
   - [ ] Variables list displays correctly
   - [ ] Add variable button works
   - [ ] Edit variable key/value works
   - [ ] Toggle secret works
   - [ ] Delete variable works
   - [ ] Clicking backdrop closes panel
   - [ ] Escape key closes panel

7. **No Project Selected**
   - [ ] Shows "Select a workspace and project" message

8. **Empty State**
   - [ ] Shows "No environments yet" with create button

---

## Summary

**New Files:**
- `app/components/ViewToggle.vue` - View switcher button
- `app/components/EnvironmentVariablesPanel.vue` - Slide-out panel
- `app/components/EnvironmentListItem.vue` - List row component
- `app/components/EnvironmentManager.vue` - Main container

**Modified Files:**
- `app/pages/admin/index.vue` - Replaced environment settings section (lines 3064-3234)

**Key Features Delivered:**
1. ✅ Grid/List view toggle
2. ✅ Search by environment name AND variables
3. ✅ Sorting (name, created, variables, status)
4. ✅ Slide-out panel for variable editing
5. ✅ Improved scannability with list view
6. ✅ All existing functionality preserved

**Expected Outcome:**
The "Manage Environments" view now provides a modern, searchable, sortable interface with both grid and list view options, plus a dedicated slide-out panel for focused variable editing.
