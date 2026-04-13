<template>
  <div class="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-border-default bg-bg-header flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <div>
          <h2 class="text-[14px] font-semibold text-text-primary">Feedback Configuration</h2>
          <p class="text-[11px] text-text-muted">Configure when and how users see the feedback form</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-text-muted">Status:</span>
        <span 
          class="px-2 py-0.5 text-[10px] font-medium rounded-full border"
          :class="isActive 
            ? 'bg-accent-green/10 text-accent-green border-accent-green/30' 
            : 'bg-bg-tertiary text-text-muted border-border-default'"
        >
          {{ isActive ? 'Active' : 'Inactive' }}
        </span>
      </div>
    </div>

    <!-- Form -->
    <div class="p-4 space-y-5">
      <!-- Enable/Disable -->
      <div class="flex items-center justify-between p-3 bg-bg-tertiary rounded-md border border-border-default">
        <div>
          <h3 class="text-[13px] font-medium text-text-primary">Enable Feedback Collection</h3>
          <p class="text-[11px] text-text-muted">Turn on to show feedback form to users</p>
        </div>
        <button
          @click="toggleEnabled"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          :class="config.isEnabled ? 'bg-accent-orange' : 'bg-bg-hover'"
        >
          <span
            class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
            :class="config.isEnabled ? 'translate-x-5' : 'translate-x-1'"
          />
        </button>
      </div>

      <!-- Time Window -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">
            Show From
          </label>
          <input
            v-model="config.shownFrom"
            type="datetime-local"
            class="w-full px-2.5 py-1.5 text-[13px] bg-bg-tertiary border border-border-default rounded-md focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted transition-all"
          />
          <p class="text-[10px] text-text-muted">Leave empty to start immediately</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">
            Show Until <span class="text-accent-red">*</span>
          </label>
          <input
            v-model="config.shownUntil"
            type="datetime-local"
            required
            class="w-full px-2.5 py-1.5 text-[13px] bg-bg-tertiary border border-border-default rounded-md focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted transition-all"
          />
          <p class="text-[10px] text-text-muted">Form will be hidden after this time</p>
        </div>
      </div>

      <!-- Form Content -->
      <div class="space-y-3">
        <h3 class="text-[13px] font-medium text-text-primary flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Form Content
        </h3>

        <div class="space-y-1.5">
          <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">Title</label>
          <input
            v-model="config.title"
            type="text"
            class="w-full px-2.5 py-1.5 text-[13px] bg-bg-tertiary border border-border-default rounded-md focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted transition-all"
            placeholder="We value your feedback"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">Description</label>
          <textarea
            v-model="config.description"
            rows="2"
            class="w-full px-2.5 py-1.5 text-[13px] bg-bg-tertiary border border-border-default rounded-md focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted transition-all resize-none"
            placeholder="Help us improve by sharing your thoughts"
          />
        </div>
      </div>

      <!-- Questions Builder -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-[13px] font-medium text-text-primary flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Custom Questions
          </h3>
          <button
            @click="addQuestion"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-accent-orange text-white rounded-md hover:bg-accent-orange-hover transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            Add Question
          </button>
        </div>

        <div v-if="config.questions.length === 0" class="p-4 text-center text-text-muted bg-bg-tertiary rounded-md border border-border-default border-dashed">
          <svg class="mx-auto mb-2 opacity-50" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p class="text-[12px]">No custom questions. A default rating and comment form will be shown.</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="(question, index) in config.questions"
            :key="question.id"
            class="p-3 border border-border-default rounded-md bg-bg-tertiary"
          >
            <div class="flex items-start gap-2">
              <span class="mt-1.5 text-[11px] font-medium text-text-muted w-4">{{ index + 1 }}.</span>
              <div class="flex-1 space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="question.label"
                    type="text"
                    placeholder="Question label"
                    class="px-2.5 py-1.5 text-[12px] bg-bg-secondary border border-border-default rounded focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted"
                  />
                  <select
                    v-model="question.type"
                    class="px-2.5 py-1.5 text-[12px] bg-bg-secondary border border-border-default rounded focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary"
                  >
                    <option value="rating">Rating (1-5)</option>
                    <option value="text">Text</option>
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                </div>

                <!-- Options for choice types -->
                <div v-if="question.type === 'single_choice' || question.type === 'multiple_choice'" class="space-y-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] text-text-muted">Options:</span>
                    <button
                      @click="addOption(question)"
                      class="text-[11px] text-accent-orange hover:text-accent-orange-hover"
                    >
                      + Add Option
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <div
                      v-for="(option, optIndex) in question.options"
                      :key="optIndex"
                      class="flex items-center gap-1 px-2 py-1 bg-bg-secondary border border-border-default rounded text-[11px]"
                    >
                      <input
                        v-model="question.options[optIndex]"
                        type="text"
                        class="bg-transparent text-text-primary w-20 focus:outline-none"
                        placeholder="Option"
                      />
                      <button
                        @click="removeOption(question, optIndex)"
                        class="text-text-muted hover:text-accent-red"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-3 pt-1">
                  <label class="flex items-center gap-1.5 text-[11px] text-text-secondary cursor-pointer">
                    <input
                      v-model="question.required"
                      type="checkbox"
                      class="w-3.5 h-3.5 rounded border-border-default text-accent-orange focus:ring-accent-orange"
                    />
                    Required
                  </label>
                  
                  <button
                    @click="removeQuestion(index)"
                    class="text-[11px] text-text-muted hover:text-accent-red"
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
      <div v-if="error" class="p-2.5 bg-accent-red/10 border border-accent-red/30 rounded-md">
        <p class="text-[12px] text-accent-red">{{ error }}</p>
      </div>

      <div v-if="success" class="p-2.5 bg-accent-green/10 border border-accent-green/30 rounded-md">
        <p class="text-[12px] text-accent-green">{{ success }}</p>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 pt-2 border-t border-border-default">
        <button
          @click="saveConfig"
          :disabled="isSaving"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-orange text-white rounded-md text-[12px] font-medium hover:bg-accent-orange-hover disabled:opacity-50 transition-colors"
        >
          <svg v-if="isSaving" class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          {{ isSaving ? 'Saving...' : 'Save Configuration' }}
        </button>
        
        <button
          @click="resetConfig"
          class="px-3 py-1.5 text-text-secondary bg-bg-tertiary border border-border-default rounded-md text-[12px] font-medium hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useApiClient } from '~~/composables/useApiFetch';

// API client for programmatic requests
const api = useApiClient();

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
    const response = await api.get<{ config: any }>('/api/admin/super/feedback/config');
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
    await api.post('/api/admin/super/feedback/config', {
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
