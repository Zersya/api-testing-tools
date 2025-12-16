<script setup lang="ts">
const { data: mocks, refresh, error } = await useFetch('/api/admin/mocks');

if (error.value && error.value.statusCode === 401) {
    await navigateTo('/login');
}

const showResourceModal = ref(false);
const showPreviewModal = ref(false);
const previewContent = ref('');
const resourceForm = ref({
  name: '',
  basePath: '/api/'
});

const createResource = async () => {
    try {
        await $fetch('/api/admin/resource', {
            method: 'POST',
            body: {
                resourceName: resourceForm.value.name,
                basePath: resourceForm.value.basePath + resourceForm.value.name
            }
        });
        showResourceModal.value = false;
        resourceForm.value.name = '';
        refresh();
    } catch (e) {
        alert('Error creating resource: ' + e.message);
    }
};

const deleteMock = async (id: string) => {
  if (!confirm('Are you sure?')) return;
  await $fetch(`/api/admin/mocks?id=${id}`, { method: 'DELETE' });
  refresh();
};

const toggleSecure = async (mock: any) => {
    await $fetch('/api/admin/mocks', {
        method: 'PUT',
        body: { ...mock, secure: !mock.secure }
    });
    refresh();
};

const toggleGroupSecure = async (items: any[], secure: boolean) => {
    if (!confirm(`Are you sure you want to ${secure ? 'secure' : 'unsecure'} all ${items.length} endpoints in this group?`)) return;
    
    await Promise.all(items.map(mock => $fetch('/api/admin/mocks', {
        method: 'PUT',
        body: { ...mock, secure }
    })));
    refresh();
};

const previewResponse = (response: any) => {
    previewContent.value = JSON.stringify(response, null, 2);
    showPreviewModal.value = true;
};

const showSettingsModal = ref(false);
const settingsForm = ref({
    bearerToken: ''
});

const openSettings = async () => {
    const data = await $fetch<any>('/api/admin/settings');
    settingsForm.value.bearerToken = data.bearerToken || '';
    showSettingsModal.value = true;
};

const saveSettings = async () => {
    await $fetch('/api/admin/settings', {
        method: 'POST',
        body: settingsForm.value
    });
    showSettingsModal.value = false;
    alert('Settings saved!');
};

const exportOpenAPI = async () => {
   const spec = await $fetch('/api/admin/export');
   const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'openapi.json';
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
};

const copyCurl = (mock: any) => {
    const origin = window.location.origin;
    const url = `${origin}${mock.path}`;
    const headerPart = mock.secure ? ` -H "Authorization: Bearer <TOKEN>"` : '';
    const bodyPart = ['POST', 'PUT', 'PATCH'].includes(mock.method) ? ` -d '${JSON.stringify(mock.response)}'` : '';
    // Note: body part in curl usually sends REQUEST body. But for a mock test we might want to just show the call.
    // If the mock expects a body, we don't know it. But we can just generate a simple curl command to HIT the endpoint.
    
    // Let's generate a curl that simply hits the endpoint.
    // If it's POST/PUT, we might want to add -X METHOD
    
    let curl = `curl -X ${mock.method} "${url}"${headerPart}`;
    
    if (['POST', 'PUT', 'PATCH'].includes(mock.method)) {
       curl += ` -H "Content-Type: application/json" -d '{}'`;
    }

    navigator.clipboard.writeText(curl);
    alert('cURL copied to clipboard!');
};

const groupedMocks = computed(() => {
    if (!mocks.value) return [];
    
    const groups: Record<string, any[]> = {};
    
    mocks.value.forEach((mock: any) => {
        const parts = mock.path.split('/').filter(Boolean);
        let key = 'General';
        
        if (parts.length > 0) {
            if (parts[0] === 'api' && parts.length > 1) {
                key = parts[1];
            } else {
                key = parts[0];
            }
        }
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(mock);
    });

    return Object.entries(groups).map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.path.localeCompare(b.path))
    })).sort((a, b) => a.name.localeCompare(b.name));
});
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Mock Services</h1>
      <div class="flex items-center space-x-2">
         <button @click="openSettings" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
            Settings
        </button>
        <button @click="exportOpenAPI" class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Export OpenAPI
        </button>
        <button @click="showResourceModal = true" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Create Resource
        </button>
        <NuxtLink to="/admin/create" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Create Mock
        </NuxtLink>
      </div>
    </div>

     <!-- Settings Modal -->
    <div v-if="showSettingsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 class="text-xl font-bold mb-4">Settings</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Global Bearer Token Secret</label>
                    <input v-model="settingsForm.bearerToken" type="text" placeholder="my-secret-token" class="mt-1 block w-full border border-gray-300 rounded p-2" />
                    <p class="text-xs text-gray-500 mt-1">If set, secured endpoints will require this exact token.</p>
                </div>
                <div class="flex justify-end space-x-2">
                    <button @click="showSettingsModal = false" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button @click="saveSettings" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                </div>
            </div>
        </div>
    </div>


    <!-- Resource Modal -->
    <div v-if="showResourceModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 class="text-xl font-bold mb-4">Create Full Resource</h2>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Resource Name (plural)</label>
                    <input v-model="resourceForm.name" placeholder="users" class="mt-1 block w-full border border-gray-300 rounded p-2" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Base Path Prefix</label>
                    <input v-model="resourceForm.basePath" class="mt-1 block w-full border border-gray-300 rounded p-2" />
                </div>
                <div class="flex justify-end space-x-2">
                    <button @click="showResourceModal = false" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                    <button @click="createResource" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Create</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white p-6 rounded-lg shadow-xl w-3/4 max-w-4xl h-3/4 flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">Response Preview</h2>
                <button @click="showPreviewModal = false" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50 border border-gray-200 p-4 rounded">
                <pre class="font-mono text-sm whitespace-pre-wrap break-all">{{ previewContent }}</pre>
            </div>
            <div class="flex justify-end pt-4">
                <button @click="showPreviewModal = false" class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Close</button>
            </div>
        </div>
    </div>

    <div v-if="mocks && mocks.length === 0" class="text-center py-10 text-gray-500">
        No mocks found. Create one to get started.
    </div>

    <div v-else class="space-y-8">
        <div v-for="group in groupedMocks" :key="group.name">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-xl font-bold capitalize text-gray-700 flex items-center">
                    <span class="bg-gray-200 text-gray-600 py-1 px-3 rounded text-sm mr-2">/{{ group.name }}</span>
                    Resource
                </h2>
                <div class="text-sm">
                    <button @click="toggleGroupSecure(group.items, true)" class="text-green-600 hover:text-green-800 font-medium mr-3">Secure All</button>
                    <button @click="toggleGroupSecure(group.items, false)" class="text-gray-500 hover:text-gray-700 font-medium">Unsecure All</button>
                </div>
            </div>

            <div class="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Path</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        <tr v-for="mock in group.items" :key="mock.id" class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-700">{{ mock.path }}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md min-w-[60px] justify-center" 
                                :class="{
                                'bg-green-100 text-green-800': mock.method === 'GET',
                                'bg-blue-100 text-blue-800': mock.method === 'POST',
                                'bg-yellow-100 text-yellow-800': mock.method === 'PUT',
                                'bg-red-100 text-red-800': mock.method === 'DELETE',
                                'bg-purple-100 text-purple-800': mock.method === 'PATCH',
                                }">
                                {{ mock.method }}
                            </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 py-0.5 rounded text-sm font-medium"
                                    :class="mock.status >= 200 && mock.status < 300 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'">
                                    {{ mock.status }}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <button @click="toggleSecure(mock)" 
                                    class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                                    :class="mock.secure ? 'bg-green-600' : 'bg-gray-200'"
                                >
                                    <span class="sr-only">Use setting</span>
                                    <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                        :class="mock.secure ? 'translate-x-5' : 'translate-x-0'"
                                    />
                                </button>
                                <span class="ml-2 text-xs text-gray-500">{{ mock.secure ? 'Bearer' : 'Public' }}</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                <button @click="copyCurl(mock)" class="text-gray-600 hover:text-gray-900">Copy cURL</button>
                                <button @click="previewResponse(mock.response)" class="text-gray-600 hover:text-gray-900">Preview</button>
                                <NuxtLink :to="`/admin/${mock.id}`" class="text-indigo-600 hover:text-indigo-900">Edit</NuxtLink>
                                <button @click="deleteMock(mock.id)" class="text-red-600 hover:text-red-900">Delete</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  </div>
</template>
