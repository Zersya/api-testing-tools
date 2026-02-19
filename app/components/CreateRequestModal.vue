<script setup lang="ts">
interface Props {
  show: boolean;
  folderId?: string;
  folderName?: string;
  collectionId?: string;
  collectionName?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  created: [request: any];
}>();

const form = ref({
  name: '',
  method: 'GET' as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
  url: '',
  headers: '',
  body: '',
  authType: 'none'
});

const isSubmitting = ref(false);
const error = ref('');

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

const canSubmit = computed(() => {
  return !isSubmitting.value && form.value.name.trim() && form.value.url.trim();
});

const resetForm = () => {
  form.value = {
    name: '',
    method: 'GET',
    url: '',
    headers: '',
    body: '',
    authType: 'none'
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

watch(() => [props.folderId, props.collectionId], () => {
  resetForm();
});

const createRequest = async () => {
  if (!form.value.name.trim() || !form.value.url.trim()) {
    error.value = 'Name and URL are required';
    return;
  }

  isSubmitting.value = true;
  error.value = '';

  try {
    let headers = null;
    if (form.value.headers.trim()) {
      try {
        headers = JSON.parse(form.value.headers);
      } catch {
        error.value = 'Headers must be valid JSON';
        isSubmitting.value = false;
        return;
      }
    }

    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(form.value.method) && form.value.body.trim()) {
      try {
        body = JSON.parse(form.value.body);
      } catch {
        error.value = 'Body must be valid JSON';
        isSubmitting.value = false;
        return;
      }
    }

    let auth = null;
    if (form.value.authType !== 'none') {
      auth = { type: form.value.authType };
    }

    const requestBody = {
      name: form.value.name.trim(),
      method: form.value.method,
      url: form.value.url.trim(),
      headers,
      body,
      auth
    };

    let result;
    if (props.collectionId) {
      // Creating request at collection root
      result = await $fetch(`/api/admin/collections/${props.collectionId}/requests`, {
        method: 'POST',
        body: requestBody
      });
    } else if (props.folderId) {
      // Creating request in a folder
      result = await $fetch(`/api/admin/folders/${props.folderId}/requests`, {
        method: 'POST',
        body: requestBody
      });
    } else {
      error.value = 'No folder or collection specified';
      isSubmitting.value = false;
      return;
    }

    emit('created', result);
    handleClose();
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create request';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Modal :show="show" title="Create New Request" size="lg" @close="handleClose">
    <div v-if="error" class="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md">
      <p class="text-sm text-accent-red">{{ error }}</p>
    </div>
    <div class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Request Name</label>
      <input
        v-model="form.name"
        placeholder="Get Users"
        class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
        :disabled="isSubmitting"
        @keyup.enter="createRequest"
      />
    </div>
    <div class="flex gap-2 mb-4">
      <div class="w-28">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Method</label>
        <select
          v-model="form.method"
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue cursor-pointer"
        >
          <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">URL</label>
        <input
          v-model="form.url"
          placeholder="https://api.example.com/users"
          class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(0,122,255,0.2)]"
          :disabled="isSubmitting"
          @keyup.enter="createRequest"
        />
      </div>
    </div>
    <div class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Headers (JSON, optional)</label>
      <textarea
        v-model="form.headers"
        placeholder='{"Content-Type": "application/json"}'
        class="w-full h-20 py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue resize-y"
        :disabled="isSubmitting"
      ></textarea>
    </div>
    <div v-if="['POST', 'PUT', 'PATCH'].includes(form.method)" class="mb-4">
      <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Body (JSON, optional)</label>
      <textarea
        v-model="form.body"
        placeholder='{"name": "John"}'
        class="w-full h-32 py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono focus:outline-none focus:border-accent-blue resize-y"
        :disabled="isSubmitting"
      ></textarea>
    </div>
    <template #footer>
      <button class="btn btn-secondary" @click="handleClose" :disabled="isSubmitting">Cancel</button>
      <button class="btn btn-primary" @click="createRequest" :disabled="!canSubmit">
        {{ isSubmitting ? 'Creating...' : 'Create Request' }}
      </button>
    </template>
  </Modal>
</template>
