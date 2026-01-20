<script setup lang="ts">
interface Environment {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  variables: {
    id: string;
    environmentId: string;
    key: string;
    value: string;
    isSecret: boolean;
  }[];
}

interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

const { data: workspaces } = await useFetch<any[]>('/api/admin/tree');

const currentProjectId = computed(() => {
  return workspaces.value?.[0]?.projects?.[0]?.id;
});

const { data: environments, refresh: refreshEnvironments } = await useFetch<Environment[]>(
  computed(() => `/api/admin/projects/${currentProjectId.value}/environments`),
  {
    immediate: true
  }
);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteConfirm = ref(false);
const showDuplicateConfirm = ref(false);
const isLoading = ref(false);
const selectedEnvironment = ref<Environment | null>(null);
const environmentToRename = ref<Environment | null>(null);
const environmentToDelete = ref<Environment | null>(null);
const environmentToDuplicate = ref<Environment | null>(null);

const createEnvironmentForm = ref({
  name: ''
});

const renameEnvironmentForm = ref({
  name: ''
});

const openCreateModal = () => {
  createEnvironmentForm.value = { name: '' };
  showCreateModal.value = true;
};

const openRenameModal = (environment: Environment) => {
  environmentToRename.value = environment;
  renameEnvironmentForm.value = { name: environment.name };
  showEditModal.value = true;
};

const openDeleteConfirm = (environment: Environment) => {
  environmentToDelete.value = environment;
  showDeleteConfirm.value = true;
};

const openDuplicateConfirm = (environment: Environment) => {
  environmentToDuplicate.value = environment;
  showDuplicateConfirm.value = true;
};

const createEnvironment = async () => {
  if (!createEnvironmentForm.value.name.trim()) {
    return;
  }

  try {
    isLoading.value = true;
    await $fetch(`/api/admin/projects/${currentProjectId.value}/environments`, {
      method: 'POST',
      body: {
        name: createEnvironmentForm.value.name.trim()
      }
    });
    showCreateModal.value = false;
    createEnvironmentForm.value = { name: '' };
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error creating environment: ' + (e.data?.message || e.message));
  } finally {
    isLoading.value = false;
  }
};

const renameEnvironment = async () => {
  if (!environmentToRename.value || !renameEnvironmentForm.value.name.trim()) {
    return;
  }

  try {
    isLoading.value = true;
    await $fetch(`/api/admin/environments/${environmentToRename.value.id}`, {
      method: 'PUT',
      body: {
        name: renameEnvironmentForm.value.name.trim()
      }
    });
    showEditModal.value = false;
    environmentToRename.value = null;
    renameEnvironmentForm.value = { name: '' };
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error renaming environment: ' + (e.data?.message || e.message));
  } finally {
    isLoading.value = false;
  }
};

const deleteEnvironment = async () => {
  if (!environmentToDelete.value) {
    return;
  }

  try {
    isLoading.value = true;
    await $fetch(`/api/admin/environments/${environmentToDelete.value.id}`, {
      method: 'DELETE'
    });
    showDeleteConfirm.value = false;
    environmentToDelete.value = null;
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error deleting environment: ' + (e.data?.message || e.message));
  } finally {
    isLoading.value = false;
  }
};

const duplicateEnvironment = async () => {
  if (!environmentToDuplicate.value) {
    return;
  }

  try {
    isLoading.value = true;
    await $fetch(`/api/admin/environments/${environmentToDuplicate.value.id}/duplicate`, {
      method: 'POST'
    });
    showDuplicateConfirm.value = false;
    environmentToDuplicate.value = null;
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error duplicating environment: ' + (e.data?.message || e.message));
  } finally {
    isLoading.value = false;
  }
};

const activateEnvironment = async (environment: Environment) => {
  if (environment.isActive) {
    return;
  }

  try {
    await $fetch(`/api/admin/environments/${environment.id}/activate`, {
      method: 'PUT'
    });
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error activating environment: ' + e.message);
  }
};

const addVariable = async (environment: Environment) => {
  try {
    await $fetch(`/api/admin/environments/${environment.id}/variables`, {
      method: 'POST',
      body: {
        key: 'NEW_VARIABLE',
        value: '',
        isSecret: false
      }
    });
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error adding variable: ' + (e.data?.message || e.message));
  }
};

const updateVariable = async (variable: EnvironmentVariable, key: string, value: string, isSecret: boolean) => {
  try {
    await $fetch(`/api/admin/variables/${variable.id}`, {
      method: 'PUT',
      body: {
        key: key.trim(),
        value,
        isSecret
      }
    });
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error updating variable: ' + (e.data?.message || e.message));
  }
};

const deleteVariable = async (variableId: string) => {
  try {
    await $fetch(`/api/admin/variables/${variableId}`, {
      method: 'DELETE'
    });
    await refreshEnvironments();
  } catch (e: any) {
    alert('Error deleting variable: ' + (e.data?.message || e.message));
  }
};
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader title="Environment Management" />

    <main class="flex-1 overflow-hidden bg-bg-primary">
      <div class="h-full flex flex-col max-w-7xl mx-auto p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-semibold text-text-primary mb-1">Environments</h1>
            <p class="text-sm text-text-secondary">Manage environments and their variables for your project</p>
          </div>
          <button class="btn btn-primary" @click="openCreateModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Environment
          </button>
        </div>

        <div v-if="!environments || environments.length === 0" class="flex flex-col items-center justify-center flex-1 text-center">
          <div class="mb-6">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-20">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-text-primary mb-2">No environments yet</h2>
          <p class="text-text-secondary mb-6 max-w-sm">Create your first environment to start managing variables for different stages like development, staging, and production.</p>
          <button class="btn btn-primary" @click="openCreateModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Environment
          </button>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pb-4">
          <div v-for="environment in environments" :key="environment.id" class="bg-bg-secondary border border-border-default rounded-xl overflow-hidden">
            <div class="p-4 border-b border-border-default">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="environment.isActive ? 'text-accent-green' : 'text-text-muted'">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                    <h3 class="text-sm font-semibold text-text-primary">{{ environment.name }}</h3>
                  </div>
                  <span v-if="environment.isActive" class="py-0.5 px-2 bg-accent-green/15 text-accent-green text-[10px] font-semibold uppercase rounded-full">Active</span>
                </div>
                <div class="flex items-center gap-1">
                  <button v-if="!environment.isActive" class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-green" @click="activateEnvironment(environment)" title="Activate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </button>
                  <button class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" @click="openRenameModal(environment)" title="Rename">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                  <button class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-text-primary" @click="openDuplicateConfirm(environment)" title="Duplicate">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  <button class="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded text-text-muted cursor-pointer transition-all duration-fast hover:bg-bg-hover hover:text-accent-red" @click="openDeleteConfirm(environment)" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-medium text-text-secondary uppercase tracking-wide">{{ environment.variables.length }} Variable{{ environment.variables.length !== 1 ? 's' : '' }}</span>
                <button class="flex items-center gap-1 text-xs font-medium text-accent-blue border-none bg-transparent cursor-pointer transition-all duration-fast hover:text-accent-blue/80" @click="addVariable(environment)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Variable
                </button>
              </div>

              <div v-if="environment.variables.length === 0" class="py-8 text-center">
                <p class="text-xs text-text-muted">No variables defined for this environment</p>
              </div>

              <div v-else class="space-y-2">
                <div v-for="variable in environment.variables" :key="variable.id" class="flex items-center gap-2 group">
                  <input
                    v-model="variable.key"
                    @blur="updateVariable(variable, variable.key, variable.value, variable.isSecret)"
                    @keyup.enter="($event.target as HTMLInputElement).blur()"
                    class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                    placeholder="Variable name"
                  />
                  <div class="flex-1 flex items-center gap-2">
                    <input
                      v-model="variable.value"
                      @blur="updateVariable(variable, variable.key, variable.value, variable.isSecret)"
                      @keyup.enter="($event.target as HTMLInputElement).blur()"
                      :type="variable.isSecret && variable.value !== '••••••••' ? 'password' : 'text'"
                      class="w-full py-1.5 px-2 bg-bg-input border border-border-default rounded-md text-text-primary text-xs font-mono focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                      placeholder="Variable value"
                    />
                    <button
                      @click="updateVariable(variable, variable.key, variable.value, !variable.isSecret)"
                      :class="[
                        'flex items-center justify-center w-8 h-8 border-none rounded cursor-pointer transition-all duration-fast',
                        variable.isSecret ? 'bg-accent-yellow/15 text-accent-yellow hover:bg-accent-yellow/25' : 'bg-bg-hover text-text-muted hover:text-text-primary'
                      ]"
                      :title="variable.isSecret ? 'Secret (toggle to reveal)' : 'Not secret (toggle to hide)'"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                  <button
                    @click="deleteVariable(variable.id)"
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
    </main>

    <Modal :show="showCreateModal" title="Create Environment" @close="showCreateModal = false">
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Environment Name</label>
        <input
          v-model="createEnvironmentForm.name"
          type="text"
          placeholder="Production, Staging, Development..."
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
          @keyup.enter="createEnvironment"
        />
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showCreateModal = false" :disabled="isLoading">Cancel</button>
        <button class="btn btn-primary" @click="createEnvironment" :disabled="isLoading || !createEnvironmentForm.name.trim()">
          <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          {{ isLoading ? 'Creating...' : 'Create Environment' }}
        </button>
      </template>
    </Modal>

    <Modal :show="showEditModal" title="Rename Environment" @close="showEditModal = false">
      <div class="mb-4">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Environment Name</label>
        <input
          v-model="renameEnvironmentForm.name"
          type="text"
          placeholder="Environment name"
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
          @keyup.enter="renameEnvironment"
        />
      </div>
      <template #footer>
        <button class="btn btn-secondary" @click="showEditModal = false" :disabled="isLoading">Cancel</button>
        <button class="btn btn-primary" @click="renameEnvironment" :disabled="isLoading || !renameEnvironmentForm.name.trim()">
          <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          {{ isLoading ? 'Renaming...' : 'Rename Environment' }}
        </button>
      </template>
    </Modal>

    <Modal :show="showDeleteConfirm" title="Delete Environment" @close="showDeleteConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to delete this environment?
        <br />
        <strong class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange">{{ environmentToDelete?.name }}</strong>
        <br /><br />
        <span class="text-accent-red">Warning:</span> This will permanently delete all variables in this environment.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDeleteConfirm = false" :disabled="isLoading">Cancel</button>
        <button class="btn btn-danger" @click="deleteEnvironment" :disabled="isLoading">
          <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          {{ isLoading ? 'Deleting...' : 'Delete Environment' }}
        </button>
      </template>
    </Modal>

    <Modal :show="showDuplicateConfirm" title="Duplicate Environment" @close="showDuplicateConfirm = false">
      <p class="text-text-secondary leading-relaxed">
        Are you sure you want to duplicate this environment?
        <br />
        <strong class="inline-block mt-2 py-1.5 px-2.5 bg-bg-tertiary rounded text-accent-orange">{{ environmentToDuplicate?.name }}</strong>
        <br /><br />
        This will create a copy of the environment with all its variables.
      </p>
      <template #footer>
        <button class="btn btn-secondary" @click="showDuplicateConfirm = false" :disabled="isLoading">Cancel</button>
        <button class="btn btn-primary" @click="duplicateEnvironment" :disabled="isLoading">
          <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
          </svg>
          {{ isLoading ? 'Duplicating...' : 'Duplicate Environment' }}
        </button>
      </template>
    </Modal>
  </div>
</template>