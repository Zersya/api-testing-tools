<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-border-default bg-bg-secondary flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h3 class="text-[13px] font-medium text-text-primary">Community Feedback</h3>
      </div>
      <span class="text-[11px] text-text-muted">{{ submissions.length }} submissions</span>
    </div>

    <!-- Filters -->
    <div class="px-4 py-2 border-b border-border-default bg-bg-secondary shrink-0">
      <div class="flex items-center gap-2">
        <button
          @click="sortBy = 'recent'"
          class="px-2 py-1 text-[11px] rounded transition-colors"
          :class="sortBy === 'recent'
            ? 'bg-accent-orange text-white'
            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'"
        >
          Recent
        </button>
        <button
          @click="sortBy = 'popular'"
          class="px-2 py-1 text-[11px] rounded transition-colors"
          :class="sortBy === 'popular'
            ? 'bg-accent-orange text-white'
            : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'"
        >
          Most Popular
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="w-5 h-5 border-2 border-border-default border-t-accent-orange rounded-full animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center">
        <p class="text-[12px] text-accent-red">{{ error }}</p>
        <button
          @click="fetchPublicSubmissions"
          class="mt-2 px-3 py-1 text-[11px] bg-accent-orange text-white rounded hover:bg-accent-orange-hover transition-colors"
        >
          Retry
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="submissions.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-bg-tertiary flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-muted">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <p class="text-[12px] text-text-muted">No public submissions yet</p>
        <p class="text-[11px] text-text-secondary mt-1">Be the first to share your feedback publicly!</p>
      </div>
    </div>

    <!-- Submissions List -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="divide-y divide-border-default">
        <div
          v-for="submission in sortedSubmissions"
          :key="submission.id"
          class="p-3 hover:bg-bg-hover transition-colors"
        >
          <!-- Submission Header -->
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <!-- Status Badge -->
              <span
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
                :class="[statusColors[submission.status].bg, statusColors[submission.status].text]"
              >
                {{ submission.status }}
              </span>
              <!-- Date -->
              <span class="text-[10px] text-text-muted">
                {{ formatDate(submission.createdAt) }}
              </span>
            </div>
            <!-- Vote Button -->
            <button
              v-if="isAuthenticated"
              @click="toggleVote(submission)"
              :disabled="isVoting[submission.id]"
              class="flex items-center gap-1 px-2 py-1 rounded transition-colors"
              :class="submission.userVoted
                ? 'bg-accent-orange/10 text-accent-orange'
                : 'bg-bg-tertiary text-text-secondary hover:bg-accent-orange/10 hover:text-accent-orange'"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                :fill-opacity="submission.userVoted ? '1' : '0'"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span class="text-[11px] font-medium">{{ submission.upvotes }}</span>
            </button>
            <span
              v-else
              class="flex items-center gap-1 px-2 py-1 text-[11px] text-text-muted"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {{ submission.upvotes }}
            </span>
          </div>

          <!-- Submission Content -->
          <div class="space-y-2">
            <!-- Rating -->
            <div v-if="submission.rating" class="flex items-center gap-1">
              <span
                v-for="n in submission.rating"
                :key="n"
                class="text-accent-yellow text-[12px]"
              >★</span>
            </div>

            <!-- Comment Preview -->
            <p v-if="submission.comment" class="text-[12px] text-text-primary line-clamp-2">
              {{ submission.comment }}
            </p>

            <!-- Responses Preview -->
            <div v-if="hasPreviewResponses(submission.responses)" class="space-y-1">
              <div
                v-for="(value, key) in previewResponses(submission.responses)"
                :key="key"
                class="text-[11px]"
              >
                <span class="text-text-muted">{{ key }}:</span>
                <span class="text-text-secondary ml-1">
                  {{ Array.isArray(value) ? value.join(', ') : String(value).substring(0, 50) }}{{ String(value).length > 50 ? '...' : '' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

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

// Props
const props = defineProps<{
  isAuthenticated: boolean;
}>;

// State
const submissions = ref<PublicSubmission[]>([]);
const isLoading = ref(true);
const isVoting = ref<Record<string, boolean>>({});
const error = ref<string | null>(null);
const sortBy = ref<'popular' | 'recent'>('recent');

// Status colors
const statusColors: Record<FeedbackStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  pending: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  process: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  resolved: { bg: 'bg-green-500/10', text: 'text-green-500' },
  closed: { bg: 'bg-gray-500/10', text: 'text-gray-500' }
};

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
  if (!props.isAuthenticated) return;

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
const hasPreviewResponses = (responses: Record<string, unknown>) => {
  const keys = Object.keys(responses).filter(k => k !== 'errorContext');
  return keys.length > 0;
};

const previewResponses = (responses: Record<string, unknown>) => {
  const filtered: Record<string, unknown> = {};
  let count = 0;
  for (const [key, value] of Object.entries(responses)) {
    if (key !== 'errorContext' && count < 2) {
      filtered[key] = value;
      count++;
    }
  }
  return filtered;
};

const formatDate = (date: string): string => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) {
      const minutes = Math.floor(diff / (60 * 1000));
      return minutes < 1 ? 'Just now' : `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}d ago`;
  }

  return d.toLocaleDateString();
};

// Watch for sort changes
watch(sortBy, () => {
  fetchPublicSubmissions();
});

// Initialize
onMounted(() => {
  fetchPublicSubmissions();
});

// Expose refresh method for parent
defineExpose({
  refresh: fetchPublicSubmissions
});
</script>
