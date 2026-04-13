<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="modelValue" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close"
      >
        <Transition name="scale">
          <div 
            v-if="modelValue" 
            class="w-full max-w-lg bg-bg-secondary rounded-lg shadow-2xl overflow-hidden border border-border-default"
          >
            <!-- Header -->
            <div class="px-4 py-3 border-b border-border-default bg-bg-header">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <h2 class="text-[15px] font-semibold text-text-primary">
                    {{ config?.title || 'We value your feedback' }}
                  </h2>
                </div>
                <button 
                  @click="close"
                  class="text-text-muted hover:text-text-primary transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p v-if="config?.description" class="mt-1 text-[12px] text-text-secondary">
                {{ config.description }}
              </p>
              <p v-if="remainingTime" class="mt-1 text-[11px] text-text-muted">
                {{ remainingTime }}
              </p>
              <!-- Link to Public Community -->
              <NuxtLink
                to="/feedback/public"
                @click="close"
                class="mt-2 inline-flex items-center gap-1.5 text-[11px] text-accent-orange hover:text-accent-orange-hover transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>See what others are saying</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ml-0.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </NuxtLink>
            </div>

            <!-- Form -->
            <div class="p-4 max-h-[60vh] overflow-y-auto">
              <form @submit.prevent="submit">
                <!-- Dynamic Questions -->
                <div v-if="config?.questions?.length" class="space-y-4">
                  <div 
                    v-for="question in config.questions" 
                    :key="question.id"
                    class="space-y-2"
                  >
                    <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      {{ question.label }}
                      <span v-if="question.required" class="text-accent-red">*</span>
                    </label>

                    <!-- Rating Type -->
                    <div v-if="question.type === 'rating'" class="flex gap-1.5">
                      <button
                        v-for="n in (question.maxRating || 5)"
                        :key="n"
                        type="button"
                        @click="setRating(question.id, n)"
                        class="w-9 h-9 rounded-md transition-all duration-200 flex items-center justify-center text-[14px] font-medium border"
                        :class="[
                          responses[question.id] === n
                            ? 'bg-accent-orange text-white border-accent-orange scale-105'
                            : 'bg-bg-tertiary text-text-secondary border-border-default hover:border-accent-orange/50'
                        ]"
                      >
                        {{ n }}
                      </button>
                    </div>

                    <!-- Text Type -->
                    <textarea
                      v-else-if="question.type === 'text'"
                      v-model="responses[question.id]"
                      :required="question.required"
                      rows="3"
                      class="w-full px-2.5 py-2 text-[13px] bg-bg-tertiary border border-border-default rounded-md focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted transition-all resize-none"
                      :placeholder="'Enter your response...'"
                    />

                    <!-- Single Choice -->
                    <div v-else-if="question.type === 'single_choice'" class="space-y-1.5">
                      <label
                        v-for="option in question.options"
                        :key="option"
                        class="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-bg-hover transition-colors"
                      >
                        <input
                          v-model="responses[question.id]"
                          :value="option"
                          :required="question.required"
                          type="radio"
                          class="w-4 h-4 text-accent-orange focus:ring-accent-orange border-border-default bg-bg-tertiary"
                        />
                        <span class="text-[13px] text-text-primary">{{ option }}</span>
                      </label>
                    </div>

                    <!-- Multiple Choice -->
                    <div v-else-if="question.type === 'multiple_choice'" class="space-y-1.5">
                      <label
                        v-for="option in question.options"
                        :key="option"
                        class="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-bg-hover transition-colors"
                      >
                        <input
                          v-model="responses[question.id]"
                          :value="option"
                          type="checkbox"
                          class="w-4 h-4 text-accent-orange rounded focus:ring-accent-orange border-border-default bg-bg-tertiary"
                        />
                        <span class="text-[13px] text-text-primary">{{ option }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Default Rating (if no questions) -->
                <div v-else class="space-y-4">
                  <div class="space-y-2">
                    <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      How would you rate your experience?
                    </label>
                    <div class="flex gap-1.5">
                      <button
                        v-for="n in 5"
                        :key="n"
                        type="button"
                        @click="overallRating = n"
                        class="w-9 h-9 rounded-md transition-all duration-200 flex items-center justify-center text-[14px] font-medium border"
                        :class="[
                          overallRating === n
                            ? 'bg-accent-orange text-white border-accent-orange scale-105'
                            : 'bg-bg-tertiary text-text-secondary border-border-default hover:border-accent-orange/50'
                        ]"
                      >
                        {{ n }}
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="block text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                      Additional comments (optional)
                    </label>
                    <textarea
                      v-model="comment"
                      rows="3"
                      class="w-full px-2.5 py-2 text-[13px] bg-bg-tertiary border border-border-default rounded-md focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary placeholder-text-muted transition-all resize-none"
                      placeholder="Tell us more about your experience..."
                    />
                  </div>
                </div>

                <!-- Visibility Toggle -->
                <div class="mt-4 p-3 bg-bg-tertiary rounded-md border border-border-default">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <svg
                        v-if="visibility === 'public'"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class="text-green-500"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      <svg
                        v-else
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        class="text-text-muted"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      <div>
                        <p class="text-[12px] font-medium text-text-primary">
                          {{ visibility === 'public' ? 'Public Submission' : 'Private Submission' }}
                        </p>
                        <p class="text-[11px] text-text-secondary">
                          {{ visibility === 'public'
                            ? 'Other users can see and vote on this'
                            : 'Only you and admins can see this'
                          }}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      @click="toggleVisibility"
                      class="px-3 py-1.5 text-[11px] rounded transition-colors"
                      :class="visibility === 'public'
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        : 'bg-accent-orange/10 text-accent-orange hover:bg-accent-orange/20'"
                    >
                      Make {{ visibility === 'public' ? 'Private' : 'Public' }}
                    </button>
                  </div>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="mt-4 p-2.5 bg-accent-red/10 border border-accent-red/30 rounded-md">
                  <p class="text-[12px] text-accent-red">{{ error }}</p>
                </div>

                <!-- Actions -->
                <div class="mt-5 flex gap-2">
                  <button
                    type="button"
                    @click="close"
                    class="flex-1 px-4 py-2 text-text-secondary bg-bg-tertiary border border-border-default rounded-md hover:bg-bg-hover hover:text-text-primary transition-colors text-[13px] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isSubmitting || !isValid"
                    class="flex-1 px-4 py-2 bg-accent-orange text-white rounded-md hover:bg-accent-orange-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-[13px] font-medium"
                  >
                    <svg v-if="isSubmitting" class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    {{ isSubmitting ? 'Submitting...' : 'Submit Feedback' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useErrorContext } from '~/composables/useErrorContext';

const { getErrorContext } = useErrorContext();

const props = defineProps<{
  modelValue: boolean;
  config: {
    id: string;
    title: string;
    description: string | null;
    questions: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
      options?: string[];
      maxRating?: number;
    }>;
    shownUntil: Date | null;
  } | null;
  remainingTime: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [data: { responses: Record<string, unknown>; rating?: number; comment?: string; visibility: 'public' | 'private' }];
}>();

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const responses = ref<Record<string, unknown>>({});
const overallRating = ref<number | undefined>(undefined);
const comment = ref('');
const visibility = ref<'public' | 'private'>('public');
const isSubmitting = ref(false);
const error = ref<string | null>(null);

const toggleVisibility = () => {
  visibility.value = visibility.value === 'public' ? 'private' : 'public';
};

const isValid = computed(() => {
  if (props.config?.questions?.length) {
    return props.config.questions.every(q => {
      if (!q.required) return true;
      const response = responses.value[q.id];
      if (Array.isArray(response)) return response.length > 0;
      return response !== undefined && response !== null && response !== '';
    });
  }
  // Default validation - rating is optional
  return true;
});

const setRating = (questionId: string, rating: number) => {
  responses.value[questionId] = rating;
};

const close = () => {
  isVisible.value = false;
};

const submit = async () => {
  if (!isValid.value) return;
  
  isSubmitting.value = true;
  error.value = null;
  
  try {
    const submissionData: { responses: Record<string, unknown>; rating?: number; comment?: string; visibility: 'public' | 'private' } = {
      responses: { ...responses.value },
      visibility: visibility.value
    };

    // If using default form, add rating and comment
    if (!props.config?.questions?.length) {
      if (overallRating.value) {
        submissionData.rating = overallRating.value;
      }
      if (comment.value) {
        submissionData.comment = comment.value;
      }
    }

    // NEW: Attach error context if there are recent errors
    const errorContext = getErrorContext();
    if (errorContext.errorCount > 0) {
      submissionData.responses.errorContext = errorContext;
    }

    emit('submit', submissionData);
    close();

    // Reset form
    responses.value = {};
    overallRating.value = undefined;
    comment.value = '';
    visibility.value = 'public';
  } catch (err: any) {
    error.value = err.message || 'Failed to submit feedback';
  } finally {
    isSubmitting.value = false;
  }
};

// Reset form when opened
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    responses.value = {};
    overallRating.value = undefined;
    comment.value = '';
    visibility.value = 'public';
    error.value = null;
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
