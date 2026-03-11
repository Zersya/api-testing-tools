<script setup lang="ts">
import { useApiClient } from '~~/composables/useApiFetch';

const api = useApiClient();

interface Props {
  show: boolean;
  collectionId: string;
  collectionName: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  created: [];
}>();

const form = ref({
  name: '',
  parentFolderId: ''
});

const isSubmitting = ref(false);
const error = ref('');

const canSubmit = computed(() => {
  return !isSubmitting.value && form.value.name.trim();
});

const resetForm = () => {
  form.value = { name: '', parentFolderId: '' };
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

const createFolder = async () => {
  if (!form.value.name.trim()) {
    error.value = 'Folder name is required';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    await api.post(`/api/admin/collections/${props.collectionId}/folders`, {
      body: {
        name: form.value.name.trim(),
        parentFolderId: form.value.parentFolderId || undefined
      }
    });
    emit('created');
    handleClose();
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create folder';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Modal :show="show" title="Create New Folder" @close="handleClose">
    <div v-if="error" class="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md">
      <p class="text-sm text-accent-red">{{ error }}</p>
    </div>
    <div class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Folder Name</label>
      <input
        v-model="form.name"
        placeholder="My Folder"
        class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        :disabled="isSubmitting"
        @keyup.enter="createFolder"
      />
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="handleClose" :disabled="isSubmitting">Cancel</button>
      <button class="btn btn-primary" @click="createFolder" :disabled="!canSubmit">
        {{ isSubmitting ? 'Creating...' : 'Create Folder' }}
      </button>
    </template>
  </Modal>
</template>
