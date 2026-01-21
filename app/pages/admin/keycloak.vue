<script setup lang="ts">
interface KeycloakConfig {
  enabled: boolean;
  realm: string;
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  logoutUrl: string;
  callbackUrl: string;
}

const settingsForm = ref<KeycloakConfig>({
  enabled: false,
  realm: '',
  clientId: '',
  clientSecret: '',
  authUrl: '',
  tokenUrl: '',
  userInfoUrl: '',
  logoutUrl: '',
  callbackUrl: ''
});

const isLoading = ref(false);
const saveStatus = ref<'idle' | 'success' | 'error'>('idle');
const saveMessage = ref('');

const fetchSettings = async () => {
  try {
    const data = await $fetch<any>('/api/admin/settings');
    const keycloakSettings = data.keycloak || {};
    settingsForm.value = {
      enabled: keycloakSettings.enabled || false,
      realm: keycloakSettings.realm || '',
      clientId: keycloakSettings.clientId || '',
      clientSecret: keycloakSettings.clientSecret || '',
      authUrl: keycloakSettings.authUrl || '',
      tokenUrl: keycloakSettings.tokenUrl || '',
      userInfoUrl: keycloakSettings.userInfoUrl || '',
      logoutUrl: keycloakSettings.logoutUrl || '',
      callbackUrl: keycloakSettings.callbackUrl || ''
    };
  } catch (e: any) {
    console.error('Failed to fetch settings:', e);
  }
};

const saveSettings = async () => {
  isLoading.value = true;
  saveStatus.value = 'idle';

  try {
    const existingData = await $fetch<any>('/api/admin/settings');
    await $fetch('/api/admin/settings', {
      method: 'POST',
      body: {
        ...existingData,
        keycloak: {
          enabled: settingsForm.value.enabled,
          realm: settingsForm.value.realm,
          clientId: settingsForm.value.clientId,
          clientSecret: settingsForm.value.clientSecret,
          authUrl: settingsForm.value.authUrl,
          tokenUrl: settingsForm.value.tokenUrl,
          userInfoUrl: settingsForm.value.userInfoUrl,
          logoutUrl: settingsForm.value.logoutUrl,
          callbackUrl: settingsForm.value.callbackUrl
        }
      }
    });
    saveStatus.value = 'success';
    saveMessage.value = 'Keycloak settings saved successfully';
    setTimeout(() => {
      saveStatus.value = 'idle';
      saveMessage.value = '';
    }, 3000);
  } catch (e: any) {
    saveStatus.value = 'error';
    saveMessage.value = e.data?.message || e.message || 'Failed to save settings';
  } finally {
    isLoading.value = false;
  }
};

const generateDefaultUrls = () => {
  if (!settingsForm.value.realm || !settingsForm.value.clientId) {
    alert('Please enter realm and client ID first');
    return;
  }

  const baseUrl = settingsForm.value.authUrl.split('/realms/')[0] || 'https://your-keycloak-domain.com';
  const realm = settingsForm.value.realm;

  settingsForm.value.authUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/auth`;
  settingsForm.value.tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
  settingsForm.value.userInfoUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/userinfo`;
  settingsForm.value.logoutUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/logout`;
};

const testConnection = async () => {
  if (!settingsForm.value.authUrl || !settingsForm.value.clientId) {
    alert('Please configure Keycloak settings first');
    return;
  }

  window.open(settingsForm.value.authUrl, '_blank');
};

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppHeader title="Keycloak SSO Configuration" />

    <main class="flex-1 overflow-hidden bg-bg-primary">
      <div class="h-full flex flex-col max-w-4xl mx-auto p-6 overflow-y-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-semibold text-text-primary mb-1">Keycloak SSO Configuration</h1>
          <p class="text-sm text-text-secondary">Configure Keycloak Single Sign-On for enterprise authentication</p>
        </div>

        <div class="bg-bg-secondary border border-border-default rounded-xl p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-base font-semibold text-text-primary">Enable Keycloak SSO</h2>
            <button
              @click="settingsForm.enabled = !settingsForm.enabled"
              :class="[
                'relative w-12 h-6 rounded-full transition-colors duration-normal cursor-pointer',
                settingsForm.enabled ? 'bg-accent-green' : 'bg-bg-input'
              ]"
            >
              <span
                :class="[
                  'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-normal shadow-sm',
                  settingsForm.enabled ? 'translate-x-6' : 'translate-x-0'
                ]"
              ></span>
            </button>
          </div>

          <p class="text-sm text-text-secondary mb-4">
            When enabled, users can sign in with their Keycloak credentials. The regular email/password login will still be available as a fallback.
          </p>
        </div>

        <div v-if="settingsForm.enabled" class="space-y-6">
          <div class="bg-bg-secondary border border-border-default rounded-xl p-6">
            <h3 class="text-base font-semibold text-text-primary mb-4">Keycloak Server Details</h3>

            <div class="grid grid-cols-1 gap-4">
              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Realm *</label>
                <input
                  v-model="settingsForm.realm"
                  type="text"
                  placeholder="my-realm"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
                <p class="text-xs text-text-muted mt-1.5">The Keycloak realm containing your application</p>
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Client ID *</label>
                <input
                  v-model="settingsForm.clientId"
                  type="text"
                  placeholder="my-app"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
                <p class="text-xs text-text-muted mt-1.5">The OAuth 2.0 client ID registered in Keycloak</p>
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Client Secret</label>
                <input
                  v-model="settingsForm.clientSecret"
                  type="password"
                  placeholder="••••••••••••••••"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
                <p class="text-xs text-text-muted mt-1.5">The client secret (leave empty for public clients)</p>
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Callback URL</label>
                <input
                  v-model="settingsForm.callbackUrl"
                  type="text"
                  placeholder="https://your-app.com/api/auth/keycloak/callback"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
                <p class="text-xs text-text-muted mt-1.5">Must be registered as a valid redirect URI in Keycloak</p>
              </div>
            </div>
          </div>

          <div class="bg-bg-secondary border border-border-default rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-semibold text-text-primary">OpenID Connect Endpoints</h3>
              <button
                @click="generateDefaultUrls"
                class="flex items-center gap-2 py-1.5 px-3 bg-bg-input text-text-secondary border border-border-default rounded-md cursor-pointer text-xs font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Auto-generate from Realm
              </button>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Authorization URL *</label>
                <input
                  v-model="settingsForm.authUrl"
                  type="text"
                  placeholder="https://keycloak.example.com/realms/{realm}/protocol/openid-connect/auth"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Token URL *</label>
                <input
                  v-model="settingsForm.tokenUrl"
                  type="text"
                  placeholder="https://keycloak.example.com/realms/{realm}/protocol/openid-connect/token"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">UserInfo URL</label>
                <input
                  v-model="settingsForm.userInfoUrl"
                  type="text"
                  placeholder="https://keycloak.example.com/realms/{realm}/protocol/openid-connect/userinfo"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
              </div>

              <div class="mb-4">
                <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Logout URL</label>
                <input
                  v-model="settingsForm.logoutUrl"
                  type="text"
                  placeholder="https://keycloak.example.com/realms/{realm}/protocol/openid-connect/logout"
                  class="w-full py-2.5 px-3 bg-bg-input border border-border-default rounded-md text-text-primary text-sm font-mono text-xs focus:outline-none focus:border-accent-blue focus:shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                />
              </div>
            </div>
          </div>

          <div v-if="saveStatus !== 'idle'" :class="['p-4 rounded-lg mb-4', saveStatus === 'success' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red']">
            {{ saveMessage }}
          </div>

          <div class="flex items-center gap-4">
            <button
              @click="testConnection"
              class="flex items-center gap-2 py-2.5 px-4 bg-bg-input text-text-secondary border border-border-default rounded-md cursor-pointer text-sm font-medium transition-all duration-fast hover:bg-bg-hover hover:text-text-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6"></path>
                <path d="M10 14 21 3"></path>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              </svg>
              Test Connection
            </button>

            <button
              @click="saveSettings"
              :disabled="isLoading || !settingsForm.realm || !settingsForm.clientId || !settingsForm.authUrl || !settingsForm.tokenUrl"
              class="flex items-center gap-2 py-2.5 px-4 bg-accent-blue text-white rounded-md border-none cursor-pointer text-sm font-medium transition-all duration-fast hover:bg-[#1976D2] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="isLoading" class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              {{ isLoading ? 'Saving...' : 'Save Configuration' }}
            </button>
          </div>
        </div>

        <div v-else class="bg-bg-secondary border border-border-default rounded-xl p-8 text-center">
          <div class="mb-4">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="mx-auto text-text-muted opacity-30">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-2">Keycloak SSO is Disabled</h3>
          <p class="text-sm text-text-secondary max-w-md mx-auto">
            Enable Keycloak SSO above to allow enterprise users to sign in with their Keycloak credentials.
          </p>
        </div>
      </div>
    </main>
  </div>
</template>
