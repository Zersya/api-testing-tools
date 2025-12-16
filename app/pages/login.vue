<script setup lang="ts">
definePageMeta({
  layout: 'empty'
});

const form = ref({
  email: '',
  password: ''
});

const login = async () => {
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: form.value
    });
    // Use navigateTo for client-side navigation
    await navigateTo('/admin', { external: true }); 
  } catch (e: any) {
    console.error('Login error:', e);
    alert('Login failed: ' + (e.response?._data?.statusMessage || e.message));
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">Admin Login</h2>
      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <input v-model="form.email" type="email" class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700">Password</label>
          <input v-model="form.password" type="password" class="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200">
          Sign In
        </button>
      </form>
    </div>
  </div>
</template>
