<script setup lang="ts">
import EnvironmentSwitcher from './EnvironmentSwitcher.vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

interface Props {
  title?: string;
  showActions?: boolean;
  environments?: Array<{
    id: string;
    projectId: string;
    name: string;
    isActive: boolean;
    variables: Array<{
      id: string;
      key: string;
      value: string;
      isSecret: boolean;
      environmentId: string;
    }>;
  }>;
  activeEnvironmentId?: string | null;
  currentProjectId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Mock Services',
  showActions: true,
  environments: () => [],
  activeEnvironmentId: null,
  currentProjectId: null
});

const emit = defineEmits<{
  openSettings: [];
  exportOpenAPI: [];
  importOpenAPI: [];
  activateEnvironment: [id: string | null];
}>();

interface UserInfo {
  sub: string;
  email: string;
  name: string;
  username: string;
  givenName: string;
  familyName: string;
  picture: string;
}

interface AuthState {
  status: string;
  user: UserInfo | null;
  authMethod: string;
  tokenExpiry: number | null;
}

const authState = ref<AuthState | null>(null);
const isCheckingAuth = ref(true);
const showUserMenu = ref(false);
const isLoggingOut = ref(false);

const route = useRoute();
const isEnvironmentsPage = computed(() => route.path === '/admin/environments');

const checkAuth = async () => {
  try {
    const data = await $fetch<AuthState>('/api/auth/check');
    authState.value = data;
  } catch (e: any) {
    if (e.statusCode === 401) {
      authState.value = null;
    }
  } finally {
    isCheckingAuth.value = false;
  }
};

const logout = async () => {
  isLoggingOut.value = true;
  try {
    await $fetch('/api/auth/logout', { method: 'POST' });
    await navigateTo('/login');
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    isLoggingOut.value = false;
  }
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
  }
  return name.substring(0, 2).toUpperCase();
};

const getTimeUntilExpiry = (): string => {
  if (!authState.value?.tokenExpiry) return '';
  const remaining = authState.value.tokenExpiry * 1000 - Date.now();
  if (remaining <= 0) return 'Expired';
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

let authCheckInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  checkAuth();

  authCheckInterval = setInterval(() => {
    if (authState.value?.tokenExpiry) {
      const remaining = authState.value.tokenExpiry * 1000 - Date.now();
      if (remaining < 5 * 60 * 1000 && remaining > 0) {
        checkAuth();
      }
    }
  }, 60000);

  document.addEventListener('click', closeUserMenu);
});

const closeUserMenu = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.user-menu-container')) {
    showUserMenu.value = false;
  }
};

onUnmounted(() => {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
  }
  document.removeEventListener('click', closeUserMenu);
});
</script>

<template>
  <header class="h-12 bg-bg-header border-b border-border-default flex items-center justify-between px-4 flex-shrink-0">
    <!-- Left Section -->
    <div class="flex items-center gap-4">
      <!-- Logo -->
      <div class="flex items-center gap-2.5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#FF6C37"/>
          <path d="M7 8.5C7 7.67 7.67 7 8.5 7H15.5C16.33 7 17 7.67 17 8.5V15.5C17 16.33 16.33 17 15.5 17H8.5C7.67 17 7 16.33 7 15.5V8.5Z" fill="white"/>
          <path d="M10 10H14M10 12H14M10 14H12" stroke="#FF6C37" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span class="text-[15px] font-semibold text-text-primary">{{ title }}</span>
      </div>
    </div>

    <!-- Center Section -->
    <div class="flex-1 flex justify-center">
      <!-- Optional: Search or other center content -->
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-2">
      <!-- Environment Switcher -->
      <EnvironmentSwitcher
        v-if="!isEnvironmentsPage"
        :environments="environments"
        :active-environment-id="activeEnvironmentId"
        @update:active-environment-id="emit('activateEnvironment', $event)"
        @manage="navigateTo('/admin/environments')"
        @create="navigateTo('/admin/environments')"
      />

      <!-- Import Button -->
      <button
        v-if="showActions && !isEnvironmentsPage"
        class="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-bg-tertiary text-text-secondary border border-border-default rounded-md cursor-pointer text-[13px] font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary hover:border-accent-orange"
        @click="emit('importOpenAPI')"
        title="Import OpenAPI"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>Import</span>
      </button>

      <!-- Export Button -->
      <button
        v-if="showActions && !isEnvironmentsPage"
        class="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-bg-tertiary text-text-secondary border border-border-default rounded-md cursor-pointer text-[13px] font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary hover:border-accent-orange"
        @click="emit('exportOpenAPI')"
        title="Export OpenAPI"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Export</span>
      </button>

      <!-- Settings Button -->
      <button
        v-if="showActions && !isEnvironmentsPage"
        class="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-transparent text-text-secondary border-none rounded-md cursor-pointer text-[13px] font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
        @click="emit('openSettings')"
        title="Settings"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <!-- User Menu -->
      <div v-if="!isCheckingAuth && authState?.user" class="relative user-menu-container">
        <button
          @click="showUserMenu = !showUserMenu"
          class="flex items-center gap-2 py-1 px-2 bg-bg-tertiary hover:bg-bg-hover border border-border-default rounded-md cursor-pointer transition-all duration-fast"
        >
          <div class="w-6 h-6 rounded-full bg-accent-orange flex items-center justify-center text-white text-xs font-semibold">
            {{ getInitials(authState.user.name || authState.user.email) }}
          </div>
          <span class="text-xs text-text-primary max-w-[120px] truncate">{{ authState.user.name || authState.user.email }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="['transition-transform duration-fast', showUserMenu ? 'rotate-180' : '']">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div
          v-if="showUserMenu"
          class="absolute right-0 top-full mt-1 w-56 bg-bg-secondary border border-border-default rounded-lg shadow-lg py-1 z-50"
        >
          <!-- User Info -->
          <div class="px-3 py-2 border-b border-border-default">
            <p class="text-xs font-medium text-text-primary truncate">{{ authState.user.name || 'User' }}</p>
            <p class="text-xs text-text-muted truncate">{{ authState.user.email }}</p>
            <div v-if="authState.tokenExpiry" class="mt-1 flex items-center gap-1">
              <span
                :class="[
                  'w-2 h-2 rounded-full',
                  authState.isTokenExpiringSoon ? 'bg-accent-yellow' : 'bg-accent-green'
                ]"
              ></span>
              <span class="text-[10px] text-text-muted">Session expires in {{ getTimeUntilExpiry() }}</span>
            </div>
          </div>

          <!-- Menu Items -->
          <a
            href="/admin/sso"
            class="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors duration-fast"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            SSO Settings
          </a>

          <button
            @click="logout"
            :disabled="isLoggingOut"
            class="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-red hover:bg-accent-red/10 transition-colors duration-fast"
          >
            <svg v-if="isLoggingOut" class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {{ isLoggingOut ? 'Signing out...' : 'Sign Out' }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
