import { ref, computed } from 'vue';

export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'single_choice';
  label: string;
  required: boolean;
  options?: string[];
  maxRating?: number;
}

export interface FeedbackConfig {
  id: string;
  title: string;
  description: string | null;
  questions: FeedbackQuestion[];
  shownUntil: Date | null;
}

export interface FeedbackStatus {
  isVisible: boolean;
  config: FeedbackConfig | null;
}

export interface FeedbackSubmission {
  responses: Record<string, unknown>;
  rating?: number;
  comment?: string;
  visibility?: 'public' | 'private';
}

const feedbackStatus = ref<FeedbackStatus | null>(null);
const isLoading = ref(false);
const hasSubmitted = ref(false);

export function useFeedback() {
  const fetchStatus = async (): Promise<FeedbackStatus> => {
    try {
      isLoading.value = true;
      const response = await $fetch<FeedbackStatus>('/api/feedback/status');
      feedbackStatus.value = response;
      return response;
    } catch (error) {
      console.error('[useFeedback] Error fetching status:', error);
      return { isVisible: false, config: null };
    } finally {
      isLoading.value = false;
    }
  };
  
  const submitFeedback = async (submission: FeedbackSubmission): Promise<{ success: boolean; submissionId?: string }> => {
    try {
      const response = await $fetch<{ success: boolean; submissionId: string }>('/api/feedback/submit', {
        method: 'POST',
        body: submission
      });
      
      if (response.success) {
        hasSubmitted.value = true;
        // Store in localStorage to prevent showing again in this session
        if (process.client) {
          localStorage.setItem('feedback_submitted', 'true');
        }
      }
      
      return response;
    } catch (error: any) {
      console.error('[useFeedback] Error submitting feedback:', error);
      throw new Error(error.data?.statusMessage || 'Failed to submit feedback');
    }
  };
  
  const shouldShowFeedback = computed(() => {
    // Check if already submitted in this browser session
    if (process.client) {
      const alreadySubmitted = localStorage.getItem('feedback_submitted');
      if (alreadySubmitted) return false;
    }
    
    // Check server status
    if (!feedbackStatus.value) return false;
    
    return feedbackStatus.value.isVisible && !hasSubmitted.value;
  });
  
  const remainingTime = computed(() => {
    if (!feedbackStatus.value?.config?.shownUntil) return null;
    
    const now = new Date();
    const until = new Date(feedbackStatus.value.config.shownUntil);
    const diff = until.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return '< 1h remaining';
  });
  
  return {
    // State
    feedbackStatus: computed(() => feedbackStatus.value),
    isLoading: computed(() => isLoading.value),
    hasSubmitted: computed(() => hasSubmitted.value),
    
    // Computed
    shouldShowFeedback,
    remainingTime,
    
    // Methods
    fetchStatus,
    submitFeedback,
    
    // Reset (for testing)
    reset: () => {
      hasSubmitted.value = false;
      if (process.client) {
        localStorage.removeItem('feedback_submitted');
      }
    }
  };
}
