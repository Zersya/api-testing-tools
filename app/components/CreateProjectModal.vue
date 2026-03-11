<script setup lang="ts">
import { useApiClient } from '~~/composables/useApiFetch';

const api = useApiClient();

interface Props {
  show: boolean;
  workspaceId: string;
  workspaceName: string;
}

const props = withDefaults(defineProps<Props>(), {
  workspaceName: ''
});

const emit = defineEmits<{
  close: [];
  created: [];
}>();

const form = ref({
  name: '',
  baseUrl: ''
});

const isSubmitting = ref(false);
const error = ref('');

const canSubmit = computed(() => {
  return !isSubmitting.value && form.value?.name?.trim();
});

const resetForm = () => {
  form.value = {
    name: '',
    baseUrl: ''
  };
  error.value = '';
};

const handleClose = () => {
  resetForm();
  emit('close');
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm();
  }
});

const createProject = async () => {
  if (!form.value.name.trim()) {
    error.value = 'Project name is required';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    await api.post(`/api/admin/workspaces/${props.workspaceId}/projects`, {
      body: {
        name: form.value.name.trim(),
        baseUrl: form.value.baseUrl.trim() || undefined
      }
    });
    emit('created');
    handleClose();
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create project';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Modal :show="show" title="Create New Project" @close="handleClose">
    <div v-if="error" class="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md">
      <p class="text-sm text-accent-red">{{ error }}</p>
    </div>
    <div class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Project Name</label>
      <input
        v-model="form.name"
        placeholder="My Project"
        class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        :disabled="isSubmitting"
        @keyup.enter="createProject"
      />
    </div>
    <div class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Base URL (optional)</label>
      <input
        v-model="form.baseUrl"
        placeholder="https://api.example.com"
        class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        :disabled="isSubmitting"
        @keyup.enter="createProject"
      />
      <p class="text-xs text-text-muted mt-1.5">Default base URL for requests in this project</p>
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="handleClose" :disabled="isSubmitting">Cancel</button>
      <button class="btn btn-primary" @click="createProject" :disabled="!canSubmit">
        {{ isSubmitting ? 'Creating...' : 'Create Project' }}
      </button>
    </template>
  </Modal>
</template>
