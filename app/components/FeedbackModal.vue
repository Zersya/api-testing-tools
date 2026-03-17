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
            class="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
          >
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-white">
                  {{ config?.title || 'We value your feedback' }}
                </h2>
                <button 
                  @click="close"
                  class="text-white/80 hover:text-white transition-colors"
                >
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p v-if="config?.description" class="mt-1 text-white/80 text-sm">
                {{ config.description }}
              </p>
              <p v-if="remainingTime" class="mt-1 text-white/60 text-xs">
                {{ remainingTime }}
              </p>
            </div>

            <!-- Form -->
            <div class="p-6 max-h-[60vh] overflow-y-auto">
              <form @submit.prevent="submit">
                <!-- Dynamic Questions -->
                <div v-if="config?.questions?.length" class="space-y-4">
                  <div 
                    v-for="question in config.questions" 
                    :key="question.id"
                    class="space-y-2"
                  >
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ question.label }}
                      <span v-if="question.required" class="text-red-500">*</span>
                    </label>

                    <!-- Rating Type -->
                    <div v-if="question.type === 'rating'" class="flex gap-2">
                      <button
                        v-for="n in (question.maxRating || 5)"
                        :key="n"
                        type="button"
                        @click="setRating(question.id, n)"
                        class="w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-lg"
                        :class="[
                          responses[question.id] === n
                            ? 'bg-indigo-500 text-white scale-110'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      :placeholder="'Enter your response...'"
                    />

                    <!-- Single Choice -->
                    <div v-else-if="question.type === 'single_choice'" class="space-y-2">
                      <label
                        v-for="option in question.options"
                        :key="option"
                        class="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          v-model="responses[question.id]"
                          :value="option"
                          :required="question.required"
                          type="radio"
                          class="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span class="text-gray-700 dark:text-gray-300">{{ option }}</span>
                      </label>
                    </div>

                    <!-- Multiple Choice -->
                    <div v-else-if="question.type === 'multiple_choice'" class="space-y-2">
                      <label
                        v-for="option in question.options"
                        :key="option"
                        class="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          v-model="responses[question.id]"
                          :value="option"
                          type="checkbox"
                          class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span class="text-gray-700 dark:text-gray-300">{{ option }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Default Rating (if no questions) -->
                <div v-else class="space-y-4">
                  <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      How would you rate your experience?
                    </label>
                    <div class="flex gap-2">
                      <button
                        v-for="n in 5"
                        :key="n"
                        type="button"
                        @click="overallRating = n"
                        class="w-10 h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-lg"
                        :class="[
                          overallRating === n
                            ? 'bg-indigo-500 text-white scale-110'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        ]"
                      >
                        {{ n }}
                      </button>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Additional comments (optional)
                    </label>
                    <textarea
                      v-model="comment"
                      rows="3"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Tell us more about your experience..."
                    />
                  </div>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
                </div>

                <!-- Actions -->
                <div class="mt-6 flex gap-3">
                  <button
                    type="button"
                    @click="close"
                    class="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isSubmitting || !isValid"
                    class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <span v-if="isSubmitting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
  submit: [data: { responses: Record<string, unknown>; rating?: number; comment?: string }];
}>();

const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const responses = ref<Record<string, unknown>>({});
const overallRating = ref<number | undefined>(undefined);
const comment = ref('');
const isSubmitting = ref(false);
const error = ref<string | null>(null);

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
    const submissionData: { responses: Record<string, unknown>; rating?: number; comment?: string } = {
      responses: { ...responses.value }
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
    
    emit('submit', submissionData);
    close();
    
    // Reset form
    responses.value = {};
    overallRating.value = undefined;
    comment.value = '';
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
    error.value = null;
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
