<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Modal from './Modal.vue';

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
  'rename': [environment: Environment, newName: string];
  'update:environment': [environment: Environment, name: string, variables: Variable[], secretValues: Record<string, string>];
  'saved': [];
}>();

const isOpen = ref(false);
const dropdownRef = ref<HTMLDivElement | null>(null);

// Edit modal state
const showEditModal = ref(false);
const environmentToEdit = ref<Environment | null>(null);
const editName = ref('');
const editVariables = ref<Variable[]>([]);
const editSecretValues = ref<Record<string, string>>({});
const isSaving = ref(false);
const validationError = ref('');

// Variable key format regex (matches API validation)
const VARIABLE_KEY_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Generate a unique ID for new variables
const generateVariableId = (): string => {
  return 'var_' + Math.random().toString(36).substring(2, 15);
};

// Initialize edit variables when opening modal
const initEditVariables = (environment: Environment) => {
  editSecretValues.value = {};
  editVariables.value = environment.variables?.map(v => {
    const varCopy = { ...v };
    // If variable is secret and masked, we'll need to fetch the actual value
    if (v.isSecret && v.value === '••••••••') {
      // Store placeholder - actual value will be fetched by parent if needed
      editSecretValues.value[v.id] = '';
    } else if (v.isSecret) {
      // Variable is secret but value is visible (shouldn't happen with masked API response)
      editSecretValues.value[v.id] = v.value;
    }
    return varCopy;
  }) || [];
};

// Add a new variable
const addVariable = () => {
  if (!environmentToEdit.value) return;
  editVariables.value.push({
    id: generateVariableId(),
    environmentId: environmentToEdit.value.id,
    key: '',
    value: '',
    isSecret: false
  });
};

// Delete a variable
const deleteVariable = (variableId: string) => {
  editVariables.value = editVariables.value.filter(v => v.id !== variableId);
  delete editSecretValues.value[variableId];
};

// Validate variables before save
const validateVariables = (): string | null => {
  const keys = editVariables.value
    .map(v => v.key.trim())
    .filter(k => k !== '');
  
  // Check for empty keys when value is present
  for (const variable of editVariables.value) {
    if (variable.key.trim() === '' && variable.value.trim() !== '') {
      return 'Variable name is required when a value is provided';
    }
  }
  
  // Check for duplicate keys
  const keySet = new Set<string>();
  for (const key of keys) {
    if (keySet.has(key)) {
      return `Duplicate variable name: "${key}"`;
    }
    keySet.add(key);
  }
  
  // Check key format
  for (const key of keys) {
    if (!VARIABLE_KEY_REGEX.test(key)) {
      return `Invalid variable name: "${key}". Must start with a letter or underscore and contain only alphanumeric characters and underscores`;
    }
  }
  
  return null;
};

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

const openEditModal = (environment: Environment) => {
  environmentToEdit.value = environment;
  editName.value = environment.name;
  initEditVariables(environment);
  showEditModal.value = true;
  isOpen.value = false;
};

const closeEditModal = () => {
  showEditModal.value = false;
  environmentToEdit.value = null;
  editName.value = '';
  editVariables.value = [];
  editSecretValues.value = {};
  isSaving.value = false;
  validationError.value = '';
};

const saveEdit = () => {
  if (!environmentToEdit.value || !editName.value.trim()) return;
  
  // Validate variables
  const error = validateVariables();
  if (error) {
    validationError.value = error;
    return;
  }
  
  validationError.value = '';
  
  // Filter out empty variables (both key and value are empty)
  const validVariables = editVariables.value.filter(v => v.key.trim() !== '' || v.value.trim() !== '');
  
// Emit update with the full environment data including variables and secret values
  isSaving.value = true;
  emit('update:environment', [
    { ...environmentToEdit.value, name: editName.value.trim(), variables: validVariables },
    editName.value.trim(),
    validVariables,
    { ...editSecretValues.value }
  ]);
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
});

defineExpose({
  closeEditModal,
  resetSaving: () => { isSaving.value = false; }
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
        class="absolute right-0 top-full mt-1 w-64 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50 overflow-hidden"
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
            class="group flex items-center gap-2 px-3 py-2 transition-colors"
            :class="[
              activeEnvironmentId === environment.id
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            ]"
          >
            <div
              @click="selectEnvironment(environment)"
              class="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
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
            <!-- Edit button for non-mock environments -->
            <button
              v-if="!environment.isMockEnvironment"
              @click.stop="openEditModal(environment)"
              class="flex items-center justify-center w-6 h-6 text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 rounded transition-all duration-fast opacity-0 group-hover:opacity-100 ml-auto"
              title="Edit environment"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
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

    <!-- Edit Environment Modal -->
    <Modal
      :show="showEditModal"
      title="Edit Environment"
      size="lg"
      @close="closeEditModal"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Environment Name</label>
          <input
            v-model="editName"
            type="text"
            class="w-full py-2 px-3 bg-bg-input border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
            placeholder="Enter environment name"
            @keyup.enter="saveEdit"
          />
        </div>
        
        <!-- Variables Section -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-text-secondary">Variables</label>
            <button
              @click="addVariable"
              class="flex items-center gap-1 text-xs font-medium text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Variable
            </button>
          </div>
          
          <!-- Validation Error -->
          <div v-if="validationError" class="mb-3 py-2 px-3 bg-accent-red/10 border border-accent-red/30 rounded-lg text-xs text-accent-red">
            {{ validationError }}
          </div>
          
          <div v-if="editVariables.length === 0" class="py-6 text-center border border-dashed border-border-default rounded-lg">
            <p class="text-xs text-text-muted mb-2">No variables defined</p>
            <button
              @click="addVariable"
              class="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Add your first variable
            </button>
          </div>
          
          <div v-else class="space-y-2 max-h-[300px] overflow-y-auto">
            <div
              v-for="variable in editVariables"
              :key="variable.id"
              class="flex items-center gap-2 group"
            >
              <input
                v-model="variable.key"
                class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                placeholder="Variable name"
              />
              <div class="flex-1 flex items-center gap-2">
                <input
                  v-model="variable.value"
                  :type="variable.isSecret ? 'password' : 'text'"
                  class="w-full py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                  placeholder="Variable value"
                />
                <button
                  @click="variable.isSecret = !variable.isSecret"
                  :class="[
                    'flex items-center justify-center w-8 h-8 border-none rounded cursor-pointer transition-all duration-fast shrink-0',
                    variable.isSecret ? 'bg-accent-yellow/15 text-accent-yellow hover:bg-accent-yellow/25' : 'bg-bg-hover text-text-muted hover:text-text-primary'
                  ]"
                  :title="variable.isSecret ? 'Secret (click to make visible)' : 'Not secret (click to hide)'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
              <button
                @click="deleteVariable(variable.id)"
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
      <template #footer>
        <button class="btn btn-secondary" @click="closeEditModal" :disabled="isSaving">Cancel</button>
        <button class="btn btn-primary" @click="saveEdit" :disabled="!editName.trim() || isSaving">
          <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
