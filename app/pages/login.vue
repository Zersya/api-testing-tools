<script setup lang="ts">
definePageMeta({
  layout: 'empty'
});

interface KeycloakConfig {
  enabled: boolean;
  realm: string;
  clientId: string;
  authURL: string;
}

interface DesktopUser {
  id: string;
  email: string;
  name?: string;
}

const form = ref({
  email: '',
  password: ''
});

const isLoading = ref(false);
const errorMessage = ref('');
const keycloakConfig = ref<KeycloakConfig | null>(null);
const isSyncing = ref(false);

const isDesktop = computed(() => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI__;
});

const fetchKeycloakConfig = async () => {
  try {
    const settings = await $fetch<any>('/api/admin/settings');
    if (settings.keycloak?.enabled) {
      keycloakConfig.value = {
        enabled: true,
        realm: settings.keycloak.realm || '',
        clientId: settings.keycloak.clientId || '',
        authURL: settings.keycloak.authURL || ''
      };
    }
  } catch (e) {
    keycloakConfig.value = null;
  }
};

const loginWithKeycloak = async () => {
  window.location.href = '/api/auth/keycloak/login';
};

const performInitialSync = async (token: string): Promise<boolean> => {
  try {
    const { triggerSync } = await import('~/composables/useSync');
    const result = await triggerSync();
    return result.success || result.errors.length === 0;
  } catch (e) {
    console.error('Initial sync failed:', e);
    return true;
  }
};

const handleSuccessfulLogin = async (token?: string) => {
  if (isDesktop.value && token) {
    isSyncing.value = true;
    try {
      await performInitialSync(token);
    } finally {
      isSyncing.value = false;
    }
  }
  await navigateTo('/admin');
};

const login = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    if (isDesktop.value) {
      const { login: desktopLogin } = await import('~/composables/useAuth');
      const success = await desktopLogin(form.value.email, form.value.password);
      
      if (success) {
        const { getToken } = await import('~/composables/useAuth');
        const token = getToken();
        await handleSuccessfulLogin(token || undefined);
      } else {
        const { error } = await import('~/composables/useAuth');
        errorMessage.value = error.value || 'Login failed';
      }
    } else {
      const response = await $fetch<any>('/api/auth/login', {
        method: 'POST',
        body: form.value
      });
      
      if (response.success) {
        await handleSuccessfulLogin(response.token);
      }
    }
  } catch (e: any) {
    console.error('Login error:', e);
    errorMessage.value = e.response?._data?.statusMessage || e.message || 'Login failed';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchKeycloakConfig();
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-primary relative overflow-hidden">
    <div class="flex flex-col items-center w-full max-w-[400px] p-6 z-10">
      <!-- Logo -->
      <div class="mb-8">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#FF6C37"/>
          <path d="M7 8.5C7 7.67 7.67 7 8.5 7H15.5C16.33 7 17 7.67 17 8.5V15.5C17 16.33 16.33 17 15.5 17H8.5C7.67 17 7 16.33 7 15.5V8.5Z" fill="white"/>
          <path d="M10 10H14M10 12H14M10 14H12" stroke="#FF6C37" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Card -->
      <div class="w-full bg-bg-secondary border border-border-default rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <!-- Header -->
        <div class="text-center mb-7">
          <h1 class="text-2xl font-semibold text-text-primary mb-2">Welcome Back</h1>
          <p class="text-sm text-text-secondary m-0">Sign in to access Mock Services</p>
        </div>

        <!-- Error Message -->
        <div 
          v-if="errorMessage" 
          class="flex items-center gap-2.5 py-3 px-4 bg-accent-red/15 border border-accent-red/30 rounded-lg mb-5 text-accent-red text-[13px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Keycloak SSO Button -->
        <div v-if="keycloakConfig?.enabled" class="mb-4">
          <button
            type="button"
            @click="loginWithKeycloak"
            class="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-[#005786] hover:bg-[#00456a] text-white rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-normal hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_6px_20px_rgba(0,87,134,0.35)] active:not-disabled:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.5 10.5C20.5 15.6 16.4 19.7 11.3 19.7C6.2 19.7 2.1 15.6 2.1 10.5C2.1 5.4 6.2 1.3 11.3 1.3C16.4 1.3 20.5 5.4 20.5 10.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 6.5V10.5L15 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M9 13C9 13 10.5 15 12 15C13.5 15 15 13 15 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Sign in with Keycloak</span>
          </button>
        </div>

        <!-- Divider -->
        <div v-if="keycloakConfig?.enabled" class="flex items-center gap-4 my-4">
          <div class="flex-1 h-px bg-border-default"></div>
          <span class="text-xs text-text-muted uppercase tracking-wide">or continue with email</span>
          <div class="flex-1 h-px bg-border-default"></div>
        </div>

        <!-- Form -->
        <form @submit.prevent="login" class="flex flex-col gap-5">
          <!-- Email Field -->
          <div class="flex flex-col gap-2">
            <label for="email" class="text-[13px] font-medium text-text-secondary normal-case tracking-normal">Email</label>
            <div class="relative">
              <svg 
                class="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" 
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input 
                id="email"
                v-model="form.email" 
                type="email" 
                placeholder="admin@mock.com"
                required 
                autocomplete="email"
                class="w-full py-3.5 px-3.5 pl-[46px] bg-bg-input border border-border-default rounded-[10px] text-text-primary text-sm transition-all duration-fast focus:outline-none focus:border-accent-orange focus:shadow-[0_0_0_3px_rgba(255,108,55,0.15)] placeholder:text-text-muted"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="flex flex-col gap-2">
            <label for="password" class="text-[13px] font-medium text-text-secondary normal-case tracking-normal">Password</label>
            <div class="relative">
              <svg 
                class="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" 
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input 
                id="password"
                v-model="form.password" 
                type="password" 
                placeholder="••••••••"
                required 
                autocomplete="current-password"
                class="w-full py-3.5 px-3.5 pl-[46px] bg-bg-input border border-border-default rounded-[10px] text-text-primary text-sm transition-all duration-fast focus:outline-none focus:border-accent-orange focus:shadow-[0_0_0_3px_rgba(255,108,55,0.15)] placeholder:text-text-muted"
              />
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            class="flex items-center justify-center gap-2.5 w-full py-3.5 bg-gradient-to-br from-accent-orange to-[#FF8C5A] border-none rounded-[10px] text-white text-[15px] font-semibold cursor-pointer transition-all duration-normal mt-2 hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[0_6px_20px_rgba(255,108,55,0.35)] active:not-disabled:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
            :disabled="isLoading || isSyncing"
          >
            <svg v-if="isLoading || isSyncing" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
            <span v-if="isLoading">Signing in...</span>
            <span v-else-if="isSyncing">Syncing...</span>
            <span v-else>Sign In</span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="mt-6 text-[13px] text-text-muted">
        Mock Services Admin Panel
      </p>
    </div>

    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute w-[600px] h-[600px] -top-[200px] -right-[200px] rounded-full bg-gradient-to-br from-accent-orange to-transparent opacity-5"></div>
      <div class="absolute w-[400px] h-[400px] -bottom-[100px] -left-[100px] rounded-full bg-gradient-to-br from-accent-blue to-transparent opacity-5"></div>
    </div>
  </div>
</template>

<style>
/* Animation spin for loading spinner - using tailwind animate-spin */
</style>
