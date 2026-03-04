<script setup lang="ts">
// Client-side handler for SSO callback in Tauri
// This page proxies the callback to the server API

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const provider = route.params.provider as string;
  const query = route.query;

  console.log(`[SSO Callback Page] Provider: ${provider}, Query:`, query);

  try {
    // Forward the callback to the server API using fetch
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const apiUrl = `/api/auth/sso/${provider}/callback?${queryString}`;

    console.log(`[SSO Callback Page] Calling API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Accept': 'application/json' // Tell server we want JSON
      }
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({ redirectUrl: '/admin' }));
      console.log('[SSO Callback Page] Success:', data);
      router.push(data.redirectUrl || '/admin');
    } else {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('[SSO Callback Page] Error:', errorData);
      router.push(`/login?error=${encodeURIComponent(errorData.message || 'SSO failed')}`);
    }
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
