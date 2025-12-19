<script setup lang="ts">
interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
}

const route = useRoute();
const id = route.params.id as string;

const { data: mock } = await useFetch<any>('/api/admin/mocks'); 
const { data: collections } = await useFetch<Collection[]>('/api/admin/collections');

const form = ref({
  id: '',
  collection: 'root',
  path: '',
  method: 'GET',
  status: 200,
  response: '{}',
  delay: 0,
  secure: false
});

if (mock.value) {
    const found = mock.value.find((m: any) => m.id === id);
    if (found) {
        form.value = {
            ...found,
            collection: found.collection || 'root',
            response: JSON.stringify(found.response, null, 2)
        };
    }
}

const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const activeTab = ref('body');
const isSaving = ref(false);
const jsonError = ref('');

// Validate JSON
const validateJson = () => {
  try {
    JSON.parse(form.value.response);
    jsonError.value = '';
    return true;
  } catch (e: any) {
    jsonError.value = e.message;
    return false;
  }
};

const formatJson = () => {
  try {
    const parsed = JSON.parse(form.value.response);
    form.value.response = JSON.stringify(parsed, null, 2);
    jsonError.value = '';
  } catch (e: any) {
    jsonError.value = 'Invalid JSON';
  }
};

const save = async () => {
  if (!validateJson()) {
    return;
  }
  
  isSaving.value = true;
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
  } catch (e: any) {
    alert('Error saving mock: ' + e.message);
  } finally {
    isSaving.value = false;
  }
};

const goBack = () => {
  navigateTo('/admin');
};

const getCollectionColor = (collectionId: string) => {
  const collection = collections.value?.find(c => c.id === collectionId);
  return collection?.color || '#6366f1';
};
</script>

<template>
  <div class="editor-container">
    <!-- Header -->
    <header class="editor-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div class="header-title">
          <h1>Edit Mock</h1>
          <span class="header-subtitle font-mono">{{ form.path }}</span>
        </div>
      </div>
      <!-- Actions removed as per request -->
    </header>

    <!-- URL Bar -->
    <div class="url-bar-section">
      <div class="url-bar">
        <select v-model="form.method" class="method-select" :class="`method-${form.method.toLowerCase()}`">
          <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
        </select>
        <input 
          v-model="form.path" 
          type="text" 
          class="url-input" 
          placeholder="/api/your-endpoint"
          required 
        />
        <button class="btn btn-primary send-btn" @click="save" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="editor-body">
      <!-- Tabs -->
      <div class="tabs-bar">
        <button 
          :class="['tab', { 'active': activeTab === 'body' }]"
          @click="activeTab = 'body'"
        >
          <span class="tab-label">Response Body</span>
        </button>
        <button 
          :class="['tab', { 'active': activeTab === 'settings' }]"
          @click="activeTab = 'settings'"
        >
          <span class="tab-label">Settings</span>
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Body Tab -->
        <div v-show="activeTab === 'body'" class="panel">
          <div class="panel-header">
            <div class="panel-header-left">
              <span class="panel-title">Response JSON</span>
              <span v-if="jsonError" class="json-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {{ jsonError }}
              </span>
            </div>
            <button class="btn-xs btn-secondary" @click="formatJson" title="Auto-format JSON">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              Format
            </button>
          </div>
          <textarea 
            v-model="form.response" 
            class="code-textarea"
            placeholder='{"message": "Hello World"}'
            @blur="validateJson"
          ></textarea>
        </div>

        <!-- Settings Tab -->
        <div v-show="activeTab === 'settings'" class="panel settings-panel">
          <div class="settings-grid">
            <!-- Collection Selector -->
            <div class="setting-item">
              <label>Collection</label>
              <div class="collection-select-wrapper">
                <div 
                  class="collection-indicator" 
                  :style="{ backgroundColor: getCollectionColor(form.collection) }"
                ></div>
                <select v-model="form.collection" class="setting-select">
                  <option v-for="collection in collections" :key="collection.id" :value="collection.id">
                    {{ collection.name }}
                  </option>
                </select>
              </div>
              <span class="setting-hint">Move this mock to a different collection</span>
            </div>
            
            <div class="setting-item">
              <label>Status Code</label>
              <input v-model.number="form.status" type="number" min="100" max="599" class="setting-input" />
              <span class="setting-hint">HTTP status code (200, 201, 400, 404, etc.)</span>
            </div>
            <div class="setting-item">
              <label>Delay (ms)</label>
              <input v-model.number="form.delay" type="number" min="0" class="setting-input" />
              <span class="setting-hint">Simulated response delay in milliseconds</span>
            </div>
            <div class="setting-item">
              <label>Security</label>
              <div class="toggle-row">
                <button 
                  @click="form.secure = !form.secure" 
                  :class="['toggle-btn', { 'active': form.secure }]"
                >
                  <span class="toggle-handle"></span>
                </button>
                <span class="toggle-label">{{ form.secure ? 'Bearer Token Required' : 'Public Access' }}</span>
              </div>
              <span class="setting-hint">Enable to require Authorization header</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

/* Header */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background-color: var(--bg-header);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms ease;
}

.back-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.header-title h1 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

/* URL Bar Section */
.url-bar-section {
  padding: 20px 24px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.url-bar {
  display: flex;
  gap: 8px;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 4px;
}

.method-select {
  padding: 10px 12px;
  background-color: transparent;
  border: none;
  border-right: 1px solid var(--border-color);
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  min-width: 100px;
}

.method-select.method-get { color: var(--method-get); }
.method-select.method-post { color: var(--method-post); }
.method-select.method-put { color: var(--method-put); }
.method-select.method-delete { color: var(--method-delete); }
.method-select.method-patch { color: var(--method-patch); }

.url-input {
  flex: 1;
  padding: 10px 12px;
  background: none;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
}

.url-input:focus {
  outline: none;
}

.url-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  padding: 10px 32px;
  font-weight: 600;
  border-radius: 6px;
}

/* Editor Body */
.editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Tabs */
.tabs-bar {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.tab {
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  margin-bottom: -1px;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--accent-orange);
  border-bottom-color: var(--accent-orange);
}

/* Tab Content */
.tab-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.panel {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

/* Panel Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-xs {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  transition: all 150ms ease;
}

.btn-xs:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-color-hover, var(--border-color));
}

.panel-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.json-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent-red);
}

.code-textarea {
  width: 100%;
  min-height: 400px;
  padding: 16px;
  background-color: var(--bg-tertiary);
  border: none;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.code-textarea:focus {
  outline: none;
}

/* Settings Panel */
.settings-panel {
  padding: 24px;
}

.settings-grid {
  display: grid;
  gap: 24px;
  max-width: 400px;
}

.setting-item label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.setting-input {
  width: 100%;
  padding: 10px 12px;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
}

.setting-input:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.setting-select {
  width: 100%;
  padding: 10px 12px;
  padding-left: 36px;
  background-color: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.collection-select-wrapper {
  position: relative;
}

.collection-indicator {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 4px;
  pointer-events: none;
}

.setting-hint {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--bg-hover);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 200ms ease;
}

.toggle-btn.active {
  background-color: var(--accent-green);
}

.toggle-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: transform 200ms ease;
}

.toggle-btn.active .toggle-handle {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 14px;
  color: var(--text-primary);
}
</style>
