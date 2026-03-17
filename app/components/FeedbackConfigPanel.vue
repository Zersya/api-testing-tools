<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Feedback Configuration</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configure when and how users see the feedback form</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 dark:text-gray-400">Status:</span>
          <span 
            class="px-2 py-1 text-xs font-medium rounded-full"
            :class="isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'"
          >
            {{ isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Form -->
    <div class="p-6 space-y-6">
      <!-- Enable/Disable -->
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div>
          <h3 class="font-medium text-gray-900 dark:text-white">Enable Feedback Collection</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">Turn on to show feedback form to users</p>
        </div>
        <button
          @click="toggleEnabled"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="config.isEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            :class="config.isEnabled ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <!-- Time Window -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Show From
          </label>
          <input
            v-model="config.shownFrom"
            type="datetime-local"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p class="text-xs text-gray-500">Leave empty to start immediately</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Show Until <span class="text-red-500">*</span>
          </label>
          <input
            v-model="config.shownUntil"
            type="datetime-local"
            required
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p class="text-xs text-gray-500">Form will be hidden after this time</p>
        </div>
      </div>

      <!-- Form Content -->
      <div class="space-y-4">
        <h3 class="font-medium text-gray-900 dark:text-white">Form Content</h3>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
          <input
            v-model="config.title"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="We value your feedback"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            v-model="config.description"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Help us improve by sharing your thoughts"
          />
        </div>
      </div>

      <!-- Questions Builder -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-gray-900 dark:text-white">Custom Questions</h3>
          <button
            @click="addQuestion"
            class="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </button>
        </div>

        <div v-if="config.questions.length === 0" class="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          No custom questions. A default rating and comment form will be shown.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(question, index) in config.questions"
            :key="question.id"
            class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30"
          >
            <div class="flex items-start gap-3">
              <span class="mt-2 text-sm font-medium text-gray-500">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <input
                    v-model="question.label"
                    type="text"
                    placeholder="Question label"
                    class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  />
                  <select
                    v-model="question.type"
                    class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="rating">Rating (1-5)</option>
                    <option value="text">Text</option>
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                </div>

                <!-- Options for choice types -->
                <div v-if="question.type === 'single_choice' || question.type === 'multiple_choice'" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-600 dark:text-gray-400">Options:</span>
                    <button
                      @click="addOption(question)"
                      class="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Option
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <div
                      v-for="(option, optIndex) in question.options"
                      :key="optIndex"
                      class="flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                    >
                      <input
                        v-model="question.options[optIndex]"
                        type="text"
                        class="bg-transparent text-sm w-24"
                        placeholder="Option"
                      />
                      <button
                        @click="removeOption(question, optIndex)"
                        class="text-gray-400 hover:text-red-500"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      v-model="question.required"
                      type="checkbox"
                      class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Required
                  </label>
                  <button
                    @click="removeQuestion(index)"
                    class="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div v-if="error" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      </div>

      <div v-if="success" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <p class="text-sm text-green-600 dark:text-green-400">{{ success }}</p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="saveConfig"
          :disabled="isSaving"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <span v-if="isSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ isSaving ? 'Saving...' : 'Save Configuration' }}
        </button>
        <button
          @click="resetConfig"
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';

interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'single_choice';
  label: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

interface FeedbackConfig {
  isEnabled: boolean;
  shownFrom: string;
  shownUntil: string;
  title: string;
  description: string;
  questions: FeedbackQuestion[];
}

const config = reactive<FeedbackConfig>({
  isEnabled: false,
  shownFrom: '',
  shownUntil: '',
  title: 'We value your feedback',
  description: 'Help us improve by sharing your thoughts',
  questions: []
});

const originalConfig = ref<FeedbackConfig | null>(null);
const isSaving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const isActive = computed(() => {
  if (!config.isEnabled) return false;
  if (!config.shownUntil) return false;
  
  const now = new Date();
  const from = config.shownFrom ? new Date(config.shownFrom) : null;
  const until = new Date(config.shownUntil);
  
  if (from && now < from) return false;
  if (now > until) return false;
  
  return true;
});

const fetchConfig = async () => {
  try {
    const response = await $fetch<{ config: any }>('/api/admin/super/feedback/config');
    if (response.config) {
      const c = response.config;
      config.isEnabled = c.isEnabled;
      config.shownFrom = c.shownFrom ? formatDateTimeLocal(new Date(c.shownFrom)) : '';
      config.shownUntil = c.shownUntil ? formatDateTimeLocal(new Date(c.shownUntil)) : '';
      config.title = c.title;
      config.description = c.description || '';
      config.questions = c.questions || [];
      originalConfig.value = { ...config, questions: [...config.questions] };
    }
  } catch (e: any) {
    console.error('Failed to fetch config:', e);
    error.value = 'Failed to load configuration';
  }
};

const formatDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toggleEnabled = () => {
  config.isEnabled = !config.isEnabled;
};

const addQuestion = () => {
  config.questions.push({
    id: crypto.randomUUID(),
    type: 'rating',
    label: '',
    required: false,
    maxRating: 5,
    options: []
  });
};

const removeQuestion = (index: number) => {
  config.questions.splice(index, 1);
};

const addOption = (question: FeedbackQuestion) => {
  if (!question.options) question.options = [];
  question.options.push('');
};

const removeOption = (question: FeedbackQuestion, index: number) => {
  question.options?.splice(index, 1);
};

const saveConfig = async () => {
  error.value = null;
  success.value = null;
  
  // Validation
  if (config.isEnabled && !config.shownUntil) {
    error.value = 'Show Until date is required when feedback is enabled';
    return;
  }
  
  isSaving.value = true;
  
  try {
    await $fetch('/api/admin/super/feedback/config', {
      method: 'POST',
      body: {
        isEnabled: config.isEnabled,
        shownFrom: config.shownFrom || null,
        shownUntil: config.shownUntil,
        title: config.title,
        description: config.description,
        questions: config.questions
      }
    });
    
    success.value = 'Configuration saved successfully';
    originalConfig.value = { ...config, questions: [...config.questions] };
  } catch (e: any) {
    console.error('Failed to save config:', e);
    error.value = e.data?.statusMessage || 'Failed to save configuration';
  } finally {
    isSaving.value = false;
  }
};

const resetConfig = () => {
  if (originalConfig.value) {
    Object.assign(config, originalConfig.value);
  }
};

onMounted(() => {
  fetchConfig();
});
</script>
