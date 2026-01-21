<script setup lang="ts">
interface Props {
  show: boolean;
  workspace: {
    id: string;
    name: string;
  } | null;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  workspace: null
});

const emit = defineEmits<{
  close: [];
  renamed: [workspace: { id: string; name: string }];
}>();

const form = ref({
  name: ''
});

const isSubmitting = ref(false);
const error = ref('');

const canSubmit = computed(() => {
  return !isSubmitting.value && form.value?.name?.trim() && form.value.name.trim() !== props.workspace?.name;
});

const resetForm = () => {
  form.value = { name: props.workspace?.name || '' };
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

watch(() => props.workspace, (newWorkspace) => {
  if (newWorkspace && props.show) {
    form.value.name = newWorkspace.name;
  }
}, { immediate: true });

const renameWorkspace = async () => {
  if (!props.workspace || !form.value.name.trim()) {
    error.value = 'Workspace name is required';
    return;
  }

  const trimmedName = form.value.name.trim();
  
  if (trimmedName === props.workspace.name) {
    handleClose();
    return;
  }

  if (trimmedName.length > 100) {
    error.value = 'Workspace name cannot exceed 100 characters';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    const result = await $fetch(`/api/admin/workspaces/${props.workspace.id}`, {
      method: 'PUT',
      body: {
        name: trimmedName
      }
    });
    emit('renamed', result);
    handleClose();
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to rename workspace';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Modal :show="show" title="Rename Workspace" @close="handleClose">
    <div v-if="error" class="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md">
      <p class="text-sm text-accent-red">{{ error }}</p>
    </div>
    <div class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Workspace Name</label>
      <input
        v-model="form.name"
        placeholder="My Workspace"
        class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        :disabled="isSubmitting"
        @keyup.enter="renameWorkspace"
        autofocus
      />
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="handleClose" :disabled="isSubmitting">Cancel</button>
      <button class="btn btn-primary" @click="renameWorkspace" :disabled="!canSubmit">
        {{ isSubmitting ? 'Renaming...' : 'Rename Workspace' }}
      </button>
    </template>
  </Modal>
</template>
