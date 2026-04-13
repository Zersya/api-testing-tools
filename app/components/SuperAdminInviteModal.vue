<script setup lang="ts">
import Modal from './Modal.vue';
import { useApiClient } from '~~/composables/useApiFetch';
import { usePermissionBadge } from '../composables/usePermissionBadge';

const api = useApiClient();
const { getPermissionBadge } = usePermissionBadge();

interface MemberInfo {
  id: string;
  email: string;
  userId: string | null;
  permission: 'view' | 'edit' | 'owner';
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  isCurrentUser: boolean;
  isOriginalOwner: boolean;
}

interface Props {
  show: boolean;
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  workspaceId: '',
  workspaceName: '',
  ownerEmail: ''
});

const emit = defineEmits<{
  close: [];
  invited: [];
}>();

// Member state
const members = ref<MemberInfo[]>([]);
const isLoadingMembers = ref(false);
const isInvitingMember = ref(false);

const newMemberForm = ref({
  email: '',
  permission: 'view' as 'view' | 'edit' | 'owner'
});

// Error and success messages
const error = ref('');
const successMessage = ref('');

const fetchMembers = async () => {
  if (!props.workspaceId) return;

  isLoadingMembers.value = true;
  error.value = '';

  try {
    const response = await api.get<{ members: MemberInfo[]; isOwner: boolean }>(`/api/admin/super/workspaces/${props.workspaceId}/members`);
    members.value = response.members;
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to fetch members';
    console.error('Error fetching members:', e);
  } finally {
    isLoadingMembers.value = false;
  }
};

const inviteMember = async () => {
  if (!props.workspaceId) return;

  isInvitingMember.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    await api.post(`/api/admin/super/workspaces/${props.workspaceId}/members`, {
      body: {
        email: newMemberForm.value.email,
        permission: newMemberForm.value.permission
      }
    });

    successMessage.value = 'Invitation sent successfully!';
    await fetchMembers();
    emit('invited');

    newMemberForm.value = {
      email: '',
      permission: 'view'
    };
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to send invitation';
    console.error('Error inviting member:', e);
  } finally {
    isInvitingMember.value = false;
  }
};

const removeMember = async (memberId: string) => {
  if (!confirm('Are you sure you want to remove this member? They will lose access to this workspace immediately.')) {
    return;
  }

  error.value = '';

  try {
    await api.delete(`/api/admin/workspaces/${props.workspaceId}/members/${memberId}`);

    successMessage.value = 'Member removed successfully!';
    await fetchMembers();
    emit('invited');
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to remove member';
    console.error('Error removing member:', e);
  }
};

const updateMemberPermission = async (memberId: string, newPermission: 'view' | 'edit' | 'owner') => {
  error.value = '';

  try {
    await api.put(`/api/admin/workspaces/${props.workspaceId}/members/${memberId}`, {
      body: {
        permission: newPermission
      }
    });

    successMessage.value = 'Permission updated successfully!';
    await fetchMembers();
    emit('invited');
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Failed to update permission';
    console.error('Error updating member permission:', e);
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'accepted':
      return 'bg-accent-green/15 text-accent-green';
    case 'pending':
      return 'bg-accent-yellow/15 text-accent-yellow';
    case 'revoked':
      return 'bg-accent-red/15 text-accent-red';
    default:
      return 'bg-bg-tertiary text-text-muted';
  }
};

const handleClose = () => {
  error.value = '';
  successMessage.value = '';
  newMemberForm.value = { email: '', permission: 'view' };
  emit('close');
};

watch(() => props.show, (newVal) => {
  if (newVal && props.workspaceId) {
    fetchMembers();
  }
});

watch(() => props.workspaceId, (newVal) => {
  if (props.show && newVal) {
    fetchMembers();
  }
});
</script>

<template>
  <Modal :show="show" title="Invite Workspace Members (Super Admin)" size="lg" @close="handleClose">
    <div class="space-y-6">
      <!-- Workspace Info -->
      <div class="p-3 bg-bg-tertiary rounded-lg">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-orange/15 text-accent-orange">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-text-primary m-0 truncate">{{ workspaceName }}</p>
            <p class="text-xs text-text-muted m-0">
              Owner: <span class="text-text-secondary">{{ ownerEmail }}</span>
            </p>
          </div>
          <div class="flex-shrink-0">
            <span class="px-2 py-1 rounded text-[10px] font-semibold uppercase bg-accent-orange/15 text-accent-orange">
              Super Admin
            </span>
          </div>
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

      <!-- Invite Member Form -->
      <div class="p-4 bg-bg-secondary border border-border-default rounded-lg">
        <h3 class="text-sm font-semibold text-text-primary mb-4 m-0">Invite New Member</h3>

        <div class="flex gap-3 mb-4">
          <div class="flex-1">
            <input
              v-model="newMemberForm.email"
              type="email"
              placeholder="Enter email address"
              class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              @keyup.enter="inviteMember"
            />
          </div>
          <div class="w-40">
            <select
              v-model="newMemberForm.permission"
              class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue"
            >
              <option value="view">Viewer</option>
              <option value="edit">Editor</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>

        <div class="flex items-center gap-3 text-xs text-text-muted mb-4">
          <div class="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span v-if="newMemberForm.permission === 'view'">Viewers can see all requests but cannot edit</span>
            <span v-else-if="newMemberForm.permission === 'edit'">Editors can view and edit requests, but cannot manage members</span>
            <span v-else>Owners can manage members, share links, and workspace settings</span>
          </div>
        </div>

        <button
          class="btn btn-primary w-full"
          @click="inviteMember"
          :disabled="isInvitingMember || !newMemberForm.email"
        >
          <svg v-if="!isInvitingMember" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span v-if="isInvitingMember">Sending...</span>
          <span v-else>Send Invitation</span>
        </button>
      </div>

      <!-- Members List -->
      <div>
        <h3 class="text-sm font-semibold text-text-primary mb-3 m-0">Workspace Members</h3>

        <div v-if="isLoadingMembers" class="flex items-center justify-center py-8 text-text-muted text-sm">
          Loading members...
        </div>

        <div v-else-if="members.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-text-muted opacity-30 mb-3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p class="text-sm text-text-muted m-0">No members yet</p>
          <p class="text-xs text-text-muted m-0">Invite members to give them direct access to this workspace</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="member in members"
            :key="member.id"
            class="p-3 bg-bg-secondary border border-border-default rounded-lg"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span class="text-sm font-medium text-text-primary">{{ member.email }}</span>

                  <span v-if="member.isCurrentUser" class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-accent-blue/15 text-accent-blue">
                    You
                  </span>

                  <span :class="[
                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                    getStatusBadgeClass(member.status)
                  ]">
                    {{ member.status }}
                  </span>

                  <span :class="[
                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                    getPermissionBadge(member.permission).className
                  ]">
                    {{ getPermissionBadge(member.permission).text }}
                  </span>
                </div>

                <div class="flex items-center gap-4 text-[10px] text-text-muted">
                  <span>Invited {{ formatDate(member.invitedAt) }}</span>
                  <span v-if="member.acceptedAt">Accepted {{ formatDate(member.acceptedAt) }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div v-if="member.status !== 'revoked' && !member.isOriginalOwner" class="flex items-center gap-1">
                <!-- Permission Dropdown -->
                <select
                  v-if="member.status === 'accepted'"
                  :value="member.permission"
                  @change="updateMemberPermission(member.id, ($event.target as HTMLSelectElement).value as 'view' | 'edit' | 'owner')"
                  class="py-1 px-2 bg-bg-input border border-border-default rounded text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                >
                  <option value="view">Viewer</option>
                  <option value="edit">Editor</option>
                  <option value="owner">Owner</option>
                </select>

                <!-- Remove Button -->
                <button
                  @click="removeMember(member.id)"
                  class="p-1.5 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                  :title="member.status === 'pending' ? 'Cancel invitation' : 'Remove member'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
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
