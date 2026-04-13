<template>
  <div class="min-h-screen bg-bg-primary">
    <!-- Header -->
    <div class="border-b border-border-default bg-bg-secondary">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-semibold text-text-primary">Community Feedback</h1>
              <p class="text-[12px] text-text-secondary">Browse and vote on feedback from the community</p>
            </div>
          </div>
          <button
            v-if="isAuthenticated"
            @click="openFeedbackModal"
            class="px-4 py-2 bg-accent-orange text-white rounded-md hover:bg-accent-orange-hover transition-colors text-[13px] font-medium flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Submit Feedback
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-4 py-6">
      <!-- Filters -->
      <div class="bg-bg-secondary p-3 rounded-lg border border-border-default mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-text-muted uppercase">Sort by:</span>
            <button
              @click="sortBy = 'recent'"
              class="px-3 py-1.5 text-[12px] rounded transition-colors"
              :class="sortBy === 'recent'
                ? 'bg-accent-orange text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'"
            >
              Most Recent
            </button>
            <button
              @click="sortBy = 'popular'"
              class="px-3 py-1.5 text-[12px] rounded transition-colors"
              :class="sortBy === 'popular'
                ? 'bg-accent-orange text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'"
            >
              Most Popular
            </button>
          </div>
          <span class="text-[12px] text-text-muted">{{ submissions.length }} submissions</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="w-6 h-6 border-2 border-border-default border-t-accent-orange rounded-full animate-spin" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="p-4 bg-accent-red/10 border border-accent-red/30 rounded-lg">
        <p class="text-[12px] text-accent-red">{{ error }}</p>
        <button
          @click="fetchPublicSubmissions"
          class="mt-2 px-3 py-1.5 text-[12px] bg-accent-orange text-white rounded hover:bg-accent-orange-hover transition-colors"
        >
          Retry
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="submissions.length === 0" class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-secondary flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-muted">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3 class="text-[14px] font-medium text-text-primary mb-1">No Public Submissions Yet</h3>
        <p class="text-[12px] text-text-secondary mb-4">Be the first to share your feedback publicly!</p>
        <button
          v-if="isAuthenticated"
          @click="openFeedbackModal"
          class="px-4 py-2 bg-accent-orange text-white rounded-md hover:bg-accent-orange-hover transition-colors text-[13px] font-medium"
        >
          Submit Feedback
        </button>
      </div>

      <!-- Submissions Grid -->
      <div v-else class="space-y-4">
        <div
          v-for="submission in sortedSubmissions"
          :key="submission.id"
          class="bg-bg-secondary rounded-lg border border-border-default overflow-hidden"
        >
          <!-- Submission Header -->
          <div class="px-4 py-3 border-b border-border-default flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Status Badge -->
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium capitalize"
                :class="[statusColors[submission.status].bg, statusColors[submission.status].text]"
              >
                {{ submission.status }}
              </span>
              <!-- Date -->
              <span class="text-[11px] text-text-muted">
                {{ formatDateFull(submission.createdAt) }}
              </span>
            </div>
            <!-- Vote Button -->
            <button
              v-if="isAuthenticated"
              @click="toggleVote(submission)"
              :disabled="isVoting[submission.id]"
              class="flex items-center gap-2 px-3 py-1.5 rounded transition-colors"
              :class="submission.userVoted
                ? 'bg-accent-orange/10 text-accent-orange border border-accent-orange/30'
                : 'bg-bg-tertiary text-text-secondary border border-border-default hover:bg-accent-orange/10 hover:text-accent-orange hover:border-accent-orange/30'"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                :fill="submission.userVoted ? 'currentColor' : 'none'"
                stroke="currentColor"
                stroke-width="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span class="text-[13px] font-medium">{{ submission.upvotes }}</span>
            </button>
            <div
              v-else
              class="flex items-center gap-2 px-3 py-1.5 text-[13px] text-text-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {{ submission.upvotes }}
            </div>
          </div>

          <!-- Submission Content -->
          <div class="p-4">
            <!-- Rating -->
            <div v-if="submission.rating" class="mb-3">
              <span class="text-[11px] text-text-muted uppercase">Rating</span>
              <p class="text-lg text-accent-yellow mt-1">{{ '★'.repeat(submission.rating) }}</p>
            </div>

            <!-- Comment -->
            <div v-if="submission.comment" class="mb-3">
              <span class="text-[11px] text-text-muted uppercase">Comment</span>
              <p class="text-[13px] text-text-primary mt-1 whitespace-pre-wrap">{{ submission.comment }}</p>
            </div>

            <!-- Responses -->
            <div v-if="hasResponses(submission.responses)">
              <span class="text-[11px] text-text-muted uppercase">Responses</span>
              <div class="mt-2 space-y-2">
                <div
                  v-for="(value, key) in filteredResponses(submission.responses)"
                  :key="key"
                  class="p-2 bg-bg-tertiary rounded border border-border-default"
                >
                  <p class="text-[10px] font-medium text-text-muted">{{ key }}</p>
                  <p class="text-[12px] text-text-primary">
                    {{ Array.isArray(value) ? value.join(', ') : value }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback Modal -->
    <FeedbackModal
      v-model="showFeedbackModal"
      :config="feedbackConfig"
      :remaining-time="remainingTime"
      @submit="handleFeedbackSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUser } from '~/composables/useUser';
import { useFeedback } from '~/composables/useFeedback';

type FeedbackStatus = 'open' | 'pending' | 'process' | 'resolved' | 'closed';

interface PublicSubmission {
  id: string;
  responses: Record<string, unknown>;
  rating: number | null;
  comment: string | null;
  status: FeedbackStatus;
  upvotes: number;
  createdAt: string;
  userVoted: boolean;
}

const { user, isAuthenticated } = useUser();
const { feedbackStatus, fetchStatus, remainingTime, submitFeedback } = useFeedback();

// State
const submissions = ref<PublicSubmission[]>([]);
const isLoading = ref(true);
const isVoting = ref<Record<string, boolean>>({});
const error = ref<string | null>(null);
const sortBy = ref<'popular' | 'recent'>('recent');
const showFeedbackModal = ref(false);

// Status colors
const statusColors: Record<FeedbackStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  pending: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  process: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  resolved: { bg: 'bg-green-500/10', text: 'text-green-500' },
  closed: { bg: 'bg-gray-500/10', text: 'text-gray-500' }
};

const feedbackConfig = computed(() => feedbackStatus.value?.config || null);

// Computed
const sortedSubmissions = computed(() => {
  if (sortBy.value === 'popular') {
    return [...submissions.value].sort((a, b) => b.upvotes - a.upvotes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [...submissions.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});

// Fetch public submissions
const fetchPublicSubmissions = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<{
      submissions: PublicSubmission[];
      total: number;
    }>('/api/feedback/public', {
      params: { sortBy: sortBy.value }
    });

    submissions.value = response.submissions;
  } catch (e: any) {
    console.error('Failed to fetch public submissions:', e);
    error.value = 'Failed to load community feedback';
  } finally {
    isLoading.value = false;
  }
};

// Toggle vote
const toggleVote = async (submission: PublicSubmission) => {
  if (!isAuthenticated.value) return;

  isVoting.value[submission.id] = true;

  try {
    const action = submission.userVoted ? 'downvote' : 'upvote';

    const response = await $fetch(`/api/feedback/${submission.id}/vote`, {
      method: 'POST',
      body: { action }
    });

    if (response.success) {
      // Update local state
      submission.upvotes = response.upvotes;
      submission.userVoted = response.userVoted;
    }
  } catch (e) {
    console.error('Failed to vote:', e);
  } finally {
    isVoting.value[submission.id] = false;
  }
};

// Helper functions
const hasResponses = (responses: Record<string, unknown>) => {
  const keys = Object.keys(responses).filter(k => k !== 'errorContext');
  return keys.length > 0;
};

const filteredResponses = (responses: Record<string, unknown>) => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(responses)) {
    if (key !== 'errorContext') {
      filtered[key] = value;
    }
  }
  return filtered;
};

const formatDateFull = (date: string): string => {
  return new Date(date).toLocaleString();
};

const openFeedbackModal = () => {
  showFeedbackModal.value = true;
};

const handleFeedbackSubmit = async (data: { responses: Record<string, unknown>; rating?: number; comment?: string }) => {
  try {
    await submitFeedback(data);
    // Refresh the list to show the new submission if it's public
    await fetchPublicSubmissions();
  } catch (e) {
    console.error('Failed to submit feedback:', e);
  }
};

// Watch for sort changes
watch(sortBy, () => {
  fetchPublicSubmissions();
});

// Initialize
onMounted(async () => {
  await Promise.all([
    fetchPublicSubmissions(),
    fetchStatus()
  ]);
});
</script>
