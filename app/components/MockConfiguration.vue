<script setup lang="ts">
import { ref, watch, computed } from 'vue';

import type { MockConfig } from '../../server/db/schema/savedRequest';

interface Props {
  modelValue: MockConfig | null;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
});

const emit = defineEmits<{
  'update:modelValue': [config: MockConfig | null];
}>();

// Common HTTP status codes with descriptions
const commonStatusCodes = [
  { code: 200, label: '200 OK' },
  { code: 201, label: '201 Created' },
  { code: 204, label: '204 No Content' },
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 403, label: '403 Forbidden' },
  { code: 404, label: '404 Not Found' },
  { code: 500, label: '500 Internal Server Error' },
  { code: 502, label: '502 Bad Gateway' },
  { code: 503, label: '503 Service Unavailable' }
];

// Initialize local state from props
const localConfig = ref<MockConfig & { statusCode: number | null }>({
  isEnabled: true,
  statusCode: 200,
  delay: 0,
  responseBody: { message: 'Mock response' },
  responseHeaders: { 'Content-Type': 'application/json' }
});

// Parse JSON safely
const parseJson = (value: string): { valid: boolean; data: any; error?: string } => {
  try {
    const parsed = JSON.parse(value);
    return { valid: true, data: parsed };
  } catch (e: any) {
    return { valid: false, data: null, error: e.message };
  }
};

// Format JSON for display
const formatJson = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
};

// Response body as string for editing
const responseBodyText = ref('');
const bodyError = ref<string | null>(null);

// Headers as array for editing
interface HeaderItem {
  id: string;
  key: string;
  value: string;
}

const headers = ref<HeaderItem[]>([]);

// Initialize from props
const initializeFromProps = () => {
  if (props.modelValue) {
    localConfig.value = { ...props.modelValue };
    responseBodyText.value = formatJson(props.modelValue.responseBody);
    
    // Convert headers object to array
    const headerEntries = Object.entries(props.modelValue.responseHeaders || {});
    headers.value = headerEntries.length > 0
      ? headerEntries.map(([key, value]) => ({ id: crypto.randomUUID(), key, value }))
      : [{ id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json' }];
  } else {
    // Default state
    localConfig.value = {
      isEnabled: true,
      statusCode: 200,
      delay: 0,
      responseBody: { message: 'Mock response' },
      responseHeaders: { 'Content-Type': 'application/json' }
    };
    responseBodyText.value = formatJson({ message: 'Mock response' });
    headers.value = [{ id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json' }];
  }
};

// Watch for prop changes
watch(() => props.modelValue, initializeFromProps, { immediate: true });

// Update parent when local config changes
const updateParent = () => {
  // Parse body
  let parsedBody = localConfig.value.responseBody;
  if (typeof responseBodyText.value === 'string' && responseBodyText.value.trim()) {
    const result = parseJson(responseBodyText.value);
    if (result.valid) {
      parsedBody = result.data;
      bodyError.value = null;
    } else {
      bodyError.value = result.error || 'Invalid JSON';
      return; // Don't emit if JSON is invalid
    }
  }

  // Convert headers array to object
  const headersObj: Record<string, string> = {};
  headers.value.forEach(h => {
    if (h.key.trim()) {
      headersObj[h.key.trim()] = h.value;
    }
  });

  const updatedConfig: MockConfig = {
    ...localConfig.value,
    responseBody: parsedBody,
    responseHeaders: headersObj
  };

  emit('update:modelValue', updatedConfig);
};

// Debounced update
let updateTimeout: ReturnType<typeof setTimeout>;
const debouncedUpdate = () => {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(updateParent, 300);
};

// Watch for local changes
watch(() => localConfig.value.statusCode, debouncedUpdate);
watch(() => localConfig.value.delay, debouncedUpdate);
watch(() => localConfig.value.isEnabled, () => {
  updateParent();
});
watch(responseBodyText, () => {
  bodyError.value = null;
  debouncedUpdate();
});
watch(headers, debouncedUpdate, { deep: true });

// Header management
const addHeader = () => {
  headers.value.push({ id: crypto.randomUUID(), key: '', value: '' });
};

const removeHeader = (id: string) => {
  const index = headers.value.findIndex(h => h.id === id);
  if (index !== -1 && headers.value.length > 1) {
    headers.value.splice(index, 1);
  }
};

const updateHeader = (id: string, field: 'key' | 'value', value: string) => {
  const header = headers.value.find(h => h.id === id);
  if (header) {
    header[field] = value;
  }
};

// Preview mock response
const showPreview = ref(false);
const previewResponse = computed(() => {
  const result = parseJson(responseBodyText.value);
  return result.valid ? result.data : { error: 'Invalid JSON' };
});

// Common response templates
const applyTemplate = (template: 'success' | 'error' | 'empty' | 'list') => {
  switch (template) {
    case 'success':
      responseBodyText.value = JSON.stringify({
        success: true,
        data: {},
        message: 'Operation completed successfully'
      }, null, 2);
      localConfig.value.statusCode = 200;
      break;
    case 'error':
      responseBodyText.value = JSON.stringify({
        success: false,
        error: {
          code: 'ERROR_CODE',
          message: 'An error occurred'
        }
      }, null, 2);
      localConfig.value.statusCode = 400;
      break;
    case 'empty':
      responseBodyText.value = '{}';
      localConfig.value.statusCode = 204;
      break;
    case 'list':
      responseBodyText.value = JSON.stringify({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        }
      }, null, 2);
      localConfig.value.statusCode = 200;
      break;
  }
  debouncedUpdate();
};
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Enable Toggle -->
    <div class="p-4 border-b border-border-default bg-bg-secondary">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="localConfig.isEnabled"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-bg-tertiary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent-blue/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-blue"></div>
          </label>
          <span class="text-sm font-medium" :class="localConfig.isEnabled ? 'text-text-primary' : 'text-text-muted'">
            {{ localConfig.isEnabled ? 'Mock Response Enabled' : 'Mock Response Disabled' }}
          </span>
        </div>
        
        <!-- Templates -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-text-muted">Templates:</span>
          <button
            @click="applyTemplate('success')"
            class="px-2 py-1 text-xs bg-bg-input border border-border-default rounded hover:border-accent-green hover:text-accent-green transition-colors"
          >
            Success
          </button>
          <button
            @click="applyTemplate('error')"
            class="px-2 py-1 text-xs bg-bg-input border border-border-default rounded hover:border-accent-red hover:text-accent-red transition-colors"
          >
            Error
          </button>
          <button
            @click="applyTemplate('list')"
            class="px-2 py-1 text-xs bg-bg-input border border-border-default rounded hover:border-accent-blue hover:text-accent-blue transition-colors"
          >
            List
          </button>
          <button
            @click="applyTemplate('empty')"
            class="px-2 py-1 text-xs bg-bg-input border border-border-default rounded hover:border-text-secondary hover:text-text-secondary transition-colors"
          >
            Empty
          </button>
        </div>
      </div>
      
      <p v-if="!localConfig.isEnabled" class="mt-2 text-xs text-text-muted">
        Enable mock response to return predefined data when using CLOUD MOCK environment.
      </p>
    </div>

    <!-- Configuration -->
    <div class="flex-1 overflow-auto">
      <div class="p-4 space-y-6">
        <!-- Status Code & Delay -->
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-xs font-medium text-text-secondary">Status Code</label>
            <select
              v-model="localConfig.statusCode"
              class="w-full py-2 px-3 bg-bg-input border border-border-default rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              :disabled="!localConfig.isEnabled"
            >
              <option v-for="status in commonStatusCodes" :key="status.code" :value="status.code">
                {{ status.label }}
              </option>
            <option :value="null">Custom...</option>
          </select>
          
          <input
            v-if="localConfig.statusCode === null || !commonStatusCodes.find(s => s.code === localConfig.statusCode)"
              v-model.number="localConfig.statusCode"
              type="number"
              min="100"
              max="599"
              class="w-full mt-2 py-2 px-3 bg-bg-input border border-border-default rounded text-text-primary text-sm focus:outline-none focus:border-accent-blue"
              placeholder="Custom status code"
              :disabled="!localConfig.isEnabled"
            >
          </div>
          
          <div class="space-y-2">
            <label class="text-xs font-medium text-text-secondary">Delay (ms)</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="localConfig.delay"
                type="range"
                min="0"
                max="5000"
                step="100"
                class="flex-1 h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-blue"
                :disabled="!localConfig.isEnabled"
              >
              <span class="text-sm text-text-primary min-w-[60px] text-right">{{ localConfig.delay }}ms</span>
            </div>
            <p class="text-xs text-text-muted">Simulate network latency</p>
          </div>
        </div>

        <!-- Response Headers -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Response Headers</label>
            <button
              @click="addHeader"
              class="text-xs text-accent-blue hover:text-accent-blue/80 flex items-center gap-1"
              :disabled="!localConfig.isEnabled"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Header
            </button>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="header in headers"
              :key="header.id"
              class="flex items-center gap-2"
            >
              <input
                v-model="header.key"
                type="text"
                placeholder="Header name"
                class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs focus:outline-none focus:border-accent-blue"
                :disabled="!localConfig.isEnabled"
                @input="updateHeader(header.id, 'key', $event.target.value)"
              >
              <input
                v-model="header.value"
                type="text"
                placeholder="Header value"
                class="flex-1 py-1.5 px-2 bg-bg-input border border-border-default rounded text-text-primary text-xs focus:outline-none focus:border-accent-blue"
                :disabled="!localConfig.isEnabled"
                @input="updateHeader(header.id, 'value', $event.target.value)"
              >
              <button
                @click="removeHeader(header.id)"
                class="p-1 text-text-muted hover:text-accent-red transition-colors"
                :disabled="!localConfig.isEnabled || headers.length <= 1"
                :class="{ 'opacity-50 cursor-not-allowed': headers.length <= 1 }"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Response Body -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-text-secondary">Response Body (JSON)</label>
            <button
              @click="showPreview = !showPreview"
              class="text-xs text-accent-blue hover:text-accent-blue/80"
              :disabled="!localConfig.isEnabled"
            >
              {{ showPreview ? 'Hide Preview' : 'Show Preview' }}
            </button>
          </div>
          
          <div class="relative">
            <textarea
              v-model="responseBodyText"
              rows="12"
              class="w-full p-3 bg-bg-input border border-border-default rounded text-text-primary font-mono text-sm resize-none focus:outline-none focus:border-accent-blue"
              placeholder='{
  "message": "Mock response"
}'
              :disabled="!localConfig.isEnabled"
              :class="{ 'border-accent-red': bodyError }"
            ></textarea>
            
            <div v-if="bodyError" class="absolute top-2 right-2 px-2 py-0.5 bg-accent-red/15 text-accent-red text-[10px] font-semibold rounded">
              Invalid JSON
            </div>
            <div v-else-if="!bodyError && responseBodyText.trim()" class="absolute top-2 right-2 px-2 py-0.5 bg-accent-green/15 text-accent-green text-[10px] font-semibold rounded">
              Valid JSON
            </div>
          </div>
          
          <p v-if="bodyError" class="text-xs text-accent-red">
            {{ bodyError }}
          </p>
        </div>

        <!-- Preview -->
        <div v-if="showPreview" class="space-y-2">
          <label class="text-xs font-medium text-text-secondary">Preview</label>
          <div class="p-3 bg-bg-tertiary border border-border-default rounded overflow-auto max-h-60">
            <pre class="text-xs font-mono text-text-primary">{{ JSON.stringify(previewResponse, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom range slider styling */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>
