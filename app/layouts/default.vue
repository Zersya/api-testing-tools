<script setup lang="ts">
import { ref, onMounted, provide } from 'vue';
import FeedbackModal from '~/components/FeedbackModal.vue';
import { useFeedback } from '~/composables/useFeedback';

// Initialize version checking
useVersion();

const { fetchStatus, shouldShowFeedback, feedbackStatus, remainingTime, submitFeedback } = useFeedback();
const showFeedbackModal = ref(false);

// Provide function to open feedback modal
const openFeedbackModal = () => {
  if (shouldShowFeedback.value) {
    showFeedbackModal.value = true;
  }
};

provide('openFeedbackModal', openFeedbackModal);

onMounted(async () => {
  // Check if feedback should be shown
  const status = await fetchStatus();

  // Show modal after a delay if feedback is available
  if (status.isVisible) {
    setTimeout(() => {
      if (shouldShowFeedback.value) {
        showFeedbackModal.value = true;
      }
    }, 30000); // Show after 30 seconds
  }
});

const handleFeedbackSubmit = async (data: { responses: Record<string, unknown>; rating?: number; comment?: string }) => {
  try {
    await submitFeedback(data);
    // Successfully submitted
  } catch (error) {
    console.error('Failed to submit feedback:', error);
  }
};
</script>

<template>
  <div class="min-h-screen bg-bg-primary">
    <slot />
    <VersionNotification />
    <ToastNotification />

    <!-- Feedback Modal -->
    <FeedbackModal
      v-model="showFeedbackModal"
      :config="feedbackStatus?.config || null"
      :remaining-time="remainingTime"
      @submit="handleFeedbackSubmit"
    />
  </div>
</template>
