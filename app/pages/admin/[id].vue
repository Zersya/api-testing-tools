<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: mock } = await useFetch<any>('/api/admin/mocks'); 
// The helper above returns ALL mocks. Optimally we should have get-by-id endpoint, 
// but for now I'll filter it client side or assume the list is small. 
// Actually, I didn't create a specific GET by ID endpoint, only the list.
// I will just fetch all and find one. 

const form = ref({
  id: '',
  path: '',
  method: 'GET',
  status: 200,
  response: '{}',
  delay: 0
});

if (mock.value) {
    const found = mock.value.find((m: any) => m.id === id);
    if (found) {
        form.value = {
            ...found,
            response: JSON.stringify(found.response, null, 2)
        };
    }
}

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const save = async () => {
  try {
    const payload = {
      ...form.value,
      response: JSON.parse(form.value.response)
    };
    await $fetch('/api/admin/mocks', {
        method: 'PUT',
        body: payload
    });
    await navigateTo('/admin');
  } catch (e) {
    alert('Error saving mock: ' + e.message);
  }
};
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex items-center mb-6">
       <NuxtLink to="/admin" class="text-gray-500 hover:text-gray-700 mr-2">&larr; Back</NuxtLink>
      <h1 class="text-2xl font-bold">Edit Mock</h1>
    </div>

    <div class="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Path</label>
          <input v-model="form.path" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" required />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Method</label>
          <select v-model="form.method" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
            <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <div>
           <label class="block text-sm font-medium text-gray-700">Status Code</label>
           <input v-model.number="form.status" type="number" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
         <div>
           <label class="block text-sm font-medium text-gray-700">Delay (ms)</label>
           <input v-model.number="form.delay" type="number" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Response JSON</label>
          <textarea v-model="form.response" rows="10" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 font-mono text-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
        </div>

        <div class="flex justify-end pt-4">
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
</template>
