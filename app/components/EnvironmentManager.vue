<script setup lang="ts">
import { ref, computed } from 'vue';
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
          v-for="environment in filteredEnvironments"
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
                  v-model="variable.key"
                  @blur="emit('update:variable', variable, variable.key, variable.value, variable.isSecret)"
                  @keyup.enter="($event.target as HTMLInputElement).blur()"
                  class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                  placeholder="Variable name"
                />
                <div class="flex-1 flex items-center gap-2">
                  <input
                    :key="`input-${variable.id}-${variable.isSecret ? 'secret' : 'text'}`"
                    v-model="variable.value"
                    @blur="emit('update:variable', variable, variable.key, variable.value, variable.isSecret)"
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
