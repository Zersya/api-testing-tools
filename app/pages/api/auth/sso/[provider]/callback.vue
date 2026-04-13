<script setup lang="ts">
// Client-side handler for SSO callback
// This page proxies the callback to the server API

import { useApiClient } from '~~/composables/useApiFetch';

const route = useRoute();
const router = useRouter();
const api = useApiClient();

onMounted(async () => {
  const provider = route.params.provider as string;
  const query = route.query;

  console.log(`[SSO Callback Page] Provider: ${provider}, Query:`, query);

  try {
    // Forward the callback to the server API using api client
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const apiUrl = `/api/auth/sso/${provider}/callback?${queryString}`;

    console.log(`[SSO Callback Page] Calling API: ${apiUrl}`);

    const data = await api.get<{
      redirectUrl?: string;
      message?: string;
    }>(apiUrl);

    console.log('[SSO Callback Page] Success:', data);
    router.push(data.redirectUrl || '/admin');
  } catch (error: any) {
    console.error('[SSO Callback Page] Exception:', error);
    router.push(`/login?error=${encodeURIComponent(error.message || 'SSO failed')}`);
  }
});
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-bg-primary">
    <div class="flex flex-col items-center gap-4">
      <svg class="animate-spin w-8 h-8 text-accent-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      <p class="text-text-secondary">Completing authentication...</p>
    </div>
  </div>
</template>
