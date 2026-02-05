<script setup lang="ts">
import Modal from './Modal.vue';

interface ShareInfo {
  id: string;
  shareToken: string;
  shareUrl: string;
  permission: 'view' | 'edit';
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  accessCount: number;
  isExpired: boolean;
}

interface Props {
  show: boolean;
  workspaceId: string;
  workspaceName: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  workspaceId: '',
  workspaceName: ''
});

const emit = defineEmits<{
  close: [];
  shared: [];
}>();

const shares = ref<ShareInfo[]>([]);
const isLoading = ref(false);
const isCreating = ref(false);
const error = ref('');
const successMessage = ref('');
const copiedToken = ref<string | null>(null);

const newShareForm = ref({
  permission: 'view' as 'view' | 'edit',
  expiresInDays: 0 // 0 = never expires
});

const expirationOptions = [
  { value: 0, label: 'Never' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' }
];

const fetchShares = async () => {
  if (!props.workspaceId) return;
  
  isLoading.value = true;
  error.value = '';
  
  try {
    const response = await $fetch<ShareInfo[]>(`/api/admin/workspaces/${props.workspaceId}/shares`);
    shares.value = response;
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to fetch shares';
    console.error('Error fetching shares:', e);
  } finally {
    isLoading.value = false;
  }
};

const createShare = async () => {
  if (!props.workspaceId) return;
  
  isCreating.value = true;
  error.value = '';
  successMessage.value = '';
  
  try {
    const body: any = {
      permission: newShareForm.value.permission
    };
    
    if (newShareForm.value.expiresInDays > 0) {
      body.expiresInDays = newShareForm.value.expiresInDays;
    }
    
    await $fetch(`/api/admin/workspaces/${props.workspaceId}/shares`, {
      method: 'POST',
      body
    });
    
    successMessage.value = 'Share link created successfully!';
    await fetchShares();
    emit('shared');
    
    // Reset form
    newShareForm.value = {
      permission: 'view',
      expiresInDays: 0
    };
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to create share link';
    console.error('Error creating share:', e);
  } finally {
    isCreating.value = false;
  }
};

const revokeShare = async (token: string) => {
  if (!confirm('Are you sure you want to revoke this share link? All users who accessed via this link will lose access immediately.')) {
    return;
  }
  
  error.value = '';
  
  try {
    await $fetch(`/api/admin/shares/${token}`, {
      method: 'DELETE'
    });
    
    successMessage.value = 'Share link revoked successfully!';
    await fetchShares();
    emit('shared');
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to revoke share link';
    console.error('Error revoking share:', e);
  }
};

const copyShareUrl = async (shareUrl: string, token: string) => {
  try {
    await navigator.clipboard.writeText(shareUrl);
    copiedToken.value = token;
    setTimeout(() => {
      copiedToken.value = null;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy URL:', e);
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handleClose = () => {
  error.value = '';
  successMessage.value = '';
  emit('close');
};

watch(() => props.show, (newVal) => {
  if (newVal && props.workspaceId) {
    fetchShares();
  }
});

watch(() => props.workspaceId, (newVal) => {
  if (props.show && newVal) {
    fetchShares();
  }
});
</script>

<template>
  <Modal :show="show" title="Share Workspace" size="lg" @close="handleClose">
    <div class="space-y-6">
      <!-- Workspace Info -->
      <div class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-blue/15 text-accent-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <div>
          <p class="text-sm font-semibold text-text-primary m-0">{{ workspaceName }}</p>
          <p class="text-xs text-text-muted m-0">Share this workspace with other registered users</p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
        <p class="text-sm text-accent-red m-0">{{ error }}</p>
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg">
        <p class="text-sm text-accent-green m-0">{{ successMessage }}</p>
      </div>

      <!-- Create New Share -->
      <div class="p-4 bg-bg-secondary border border-border-default rounded-lg">
        <h3 class="text-sm font-semibold text-text-primary mb-4 m-0">Create New Share Link</h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Permission</label>
            <select 
              v-model="newShareForm.permission"
              class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
            >
              <option value="view">Viewer (Read Only)</option>
              <option value="edit">Editor (Can Edit)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Expires In</label>
            <select 
              v-model="newShareForm.expiresInDays"
              class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
            >
              <option v-for="opt in expirationOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3 text-xs text-text-muted mb-4">
          <div class="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span v-if="newShareForm.permission === 'view'">Viewers can see all requests but cannot edit</span>
            <span v-else>Editors can view and edit requests, but cannot delete or share</span>
          </div>
        </div>

        <button 
          class="btn btn-primary w-full"
          @click="createShare"
          :disabled="isCreating"
        >
          <svg v-if="!isCreating" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span v-if="isCreating">Creating...</span>
          <span v-else>Generate Share Link</span>
        </button>
      </div>

      <!-- Active Shares -->
      <div>
        <h3 class="text-sm font-semibold text-text-primary mb-3 m-0">Active Share Links</h3>
        
        <div v-if="isLoading" class="flex items-center justify-center py-8 text-text-muted text-sm">
          Loading shares...
        </div>
        
        <div v-else-if="shares.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted opacity-30 mb-3">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <p class="text-sm text-text-muted m-0">No active share links</p>
          <p class="text-xs text-text-muted m-0">Create a share link above to share this workspace</p>
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="share in shares" 
            :key="share.id"
            :class="[
              'p-3 border rounded-lg',
              share.isActive && !share.isExpired 
                ? 'bg-bg-secondary border-border-default' 
                : 'bg-bg-tertiary/50 border-border-default/50 opacity-60'
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <span :class="[
                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                    share.permission === 'edit' 
                      ? 'bg-accent-orange/15 text-accent-orange' 
                      : 'bg-accent-blue/15 text-accent-blue'
                  ]">
                    {{ share.permission === 'edit' ? 'Editor' : 'Viewer' }}
                  </span>
                  
                  <span v-if="!share.isActive" class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-accent-red/15 text-accent-red">
                    Revoked
                  </span>
                  
                  <span v-else-if="share.isExpired" class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-accent-yellow/15 text-accent-yellow">
                    Expired
                  </span>
                  
                  <span v-else class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-accent-green/15 text-accent-green">
                    Active
                  </span>
                </div>
                
                <div class="flex items-center gap-2 mb-2">
                  <input 
                    type="text" 
                    :value="share.shareUrl"
                    readonly
                    class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-xs font-mono text-text-secondary truncate"
                  />
                  <button 
                    v-if="share.isActive && !share.isExpired"
                    @click="copyShareUrl(share.shareUrl, share.shareToken)"
                    :class="[
                      'p-1.5 rounded transition-colors',
                      copiedToken === share.shareToken 
                        ? 'bg-accent-green/15 text-accent-green' 
                        : 'bg-bg-hover text-text-secondary hover:bg-bg-tertiary'
                    ]"
                    :title="copiedToken === share.shareToken ? 'Copied!' : 'Copy link'"
                  >
                    <svg v-if="copiedToken === share.shareToken" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
                
                <div class="flex items-center gap-4 text-[10px] text-text-muted">
                  <span>Created {{ formatDate(share.createdAt) }}</span>
                  <span v-if="share.expiresAt">Expires {{ formatDate(share.expiresAt) }}</span>
                  <span v-else>Never expires</span>
                  <span>{{ share.accessCount }} {{ share.accessCount === 1 ? 'user' : 'users' }} accessed</span>
                </div>
              </div>
              
              <button 
                v-if="share.isActive && !share.isExpired"
                @click="revokeShare(share.shareToken)"
                class="p-1.5 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                title="Revoke share link"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="handleClose">Close</button>
    </template>
  </Modal>
</template>
