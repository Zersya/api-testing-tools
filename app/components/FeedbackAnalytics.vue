<template>
  <div class="space-y-4">
    <!-- Filters -->
    <div class="bg-bg-secondary p-3 rounded-lg border border-border-default">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2">
          <label class="text-[11px] font-medium text-text-secondary uppercase">From:</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="px-2 py-1 text-[12px] bg-bg-tertiary border border-border-default rounded focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-[11px] font-medium text-text-secondary uppercase">To:</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="px-2 py-1 text-[12px] bg-bg-tertiary border border-border-default rounded focus:ring-1 focus:ring-accent-orange focus:border-accent-orange text-text-primary"
          />
        </div>
        <button
          @click="applyFilters"
          class="inline-flex items-center gap-1 px-3 py-1.5 bg-accent-orange text-white rounded text-[11px] font-medium hover:bg-accent-orange-hover transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Apply
        </button>
        <button
          @click="exportData"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-accent-orange border border-accent-orange rounded text-[11px] font-medium hover:bg-accent-orange/10 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="w-6 h-6 border-2 border-border-default border-t-accent-orange rounded-full animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-3 bg-accent-red/10 border border-accent-red/30 rounded-lg">
      <p class="text-[12px] text-accent-red">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <div class="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p class="text-[11px] text-text-muted uppercase">Total Submissions</p>
          </div>
          <p class="text-xl font-bold text-text-primary">{{ analytics?.totalSubmissions || 0 }}</p>
        </div>
        
        <div class="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <div class="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <p class="text-[11px] text-text-muted uppercase">Average Rating</p>
          </div>
          <p class="text-xl font-bold text-text-primary">
            {{ analytics?.averageRating ? analytics.averageRating.toFixed(1) : 'N/A' }}
          </p>
        </div>
        
        <div class="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <div class="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p class="text-[11px] text-text-muted uppercase">This Week</p>
          </div>
          <p class="text-xl font-bold text-text-primary">{{ submissionsThisWeek }}</p>
        </div>
        
        <div class="bg-bg-secondary p-3 rounded-lg border border-border-default">
          <div class="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p class="text-[11px] text-text-muted uppercase">Response Rate</p>
          </div>
          <p class="text-xl font-bold text-text-primary">{{ responseRate }}%</p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Rating Distribution -->
        <div class="bg-bg-secondary p-4 rounded-lg border border-border-default">
          <h3 class="text-[13px] font-medium text-text-primary mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            Rating Distribution
          </h3>
          <div v-if="hasRatings" class="space-y-1.5">
            <div v-for="rating in [5, 4, 3, 2, 1]" :key="rating" class="flex items-center gap-2">
              <span class="w-6 text-[11px] font-medium text-text-muted">{{ rating }}★</span>
              <div class="flex-1 h-4 bg-bg-tertiary rounded-sm overflow-hidden">
                <div
                  class="h-full bg-accent-orange rounded-sm transition-all duration-500"
                  :style="{ width: getRatingPercentage(rating) + '%' }"
                />
              </div>
              <span class="w-8 text-[11px] text-text-muted text-right">
                {{ analytics?.ratingDistribution[rating] || 0 }}
              </span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-text-muted">
            <svg class="mb-2 opacity-50" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <p class="text-[12px]">No ratings data available</p>
          </div>
        </div>

        <!-- Submissions Over Time -->
        <div class="bg-bg-secondary p-4 rounded-lg border border-border-default">
          <h3 class="text-[13px] font-medium text-text-primary mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Submissions Over Time
          </h3>
          <div v-if="analytics?.submissionsByDay?.length" class="h-40 flex items-end gap-0.5">
            <div
              v-for="day in analytics.submissionsByDay"
              :key="day.date"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <div
                class="w-full bg-accent-orange/80 rounded-t-sm transition-all duration-500 hover:bg-accent-orange"
                :style="{ height: getDayHeight(day.count) + 'px' }"
                :title="`${day.date}: ${day.count} submissions`"
              />
              <span class="text-[9px] text-text-muted">
                {{ formatDateShort(day.date) }}
              </span>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-text-muted">
            <svg class="mb-2 opacity-50" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <p class="text-[12px]">No data available</p>
          </div>
        </div>
      </div>

      <!-- Submissions by Workspace -->
      <div class="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <div class="px-4 py-2.5 border-b border-border-default flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <h3 class="text-[13px] font-medium text-text-primary">Submissions by Workspace</h3>
        </div>
        <div class="divide-y divide-border-default">
          <div
            v-for="ws in analytics?.submissionsByWorkspace"
            :key="ws.workspaceId || 'unknown'"
            class="px-4 py-2 flex items-center justify-between hover:bg-bg-hover"
          >
            <span class="text-[12px] text-text-primary truncate">
              {{ ws.workspaceId || 'Unknown/No Workspace' }}
            </span>
            <span class="px-2 py-0.5 bg-accent-orange/10 text-accent-orange text-[11px] font-medium rounded">
              {{ ws.count }}
            </span>
          </div>
          <div v-if="!analytics?.submissionsByWorkspace?.length" class="px-4 py-6 text-center text-text-muted">
            <p class="text-[12px]">No workspace data available</p>
          </div>
        </div>
      </div>

      <!-- Recent Submissions -->
      <div class="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
        <div class="px-4 py-2.5 border-b border-border-default flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-text-muted">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h3 class="text-[13px] font-medium text-text-primary">Recent Submissions</h3>
          </div>
          <span class="text-[11px] text-text-muted">{{ submissions.length }} total</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-bg-header">
              <tr>
                <th class="px-4 py-2 text-left text-[10px] font-medium text-text-muted uppercase tracking-wider">Date</th>
                <th class="px-4 py-2 text-left text-[10px] font-medium text-text-muted uppercase tracking-wider">User</th>
                <th class="px-4 py-2 text-left text-[10px] font-medium text-text-muted uppercase tracking-wider">Rating</th>
                <th class="px-4 py-2 text-left text-[10px] font-medium text-text-muted uppercase tracking-wider">Comment</th>
                <th class="px-4 py-2 text-left text-[10px] font-medium text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border-default">
              <tr v-for="submission in paginatedSubmissions" :key="submission.id" class="hover:bg-bg-hover">
                <td class="px-4 py-2 whitespace-nowrap text-[11px] text-text-secondary">
                  {{ formatDate(submission.createdAt) }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-[11px] text-text-primary">
                  {{ submission.userEmail || submission.userId || 'Anonymous' }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap">
                  <span v-if="submission.rating" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-yellow/10 text-accent-yellow">
                    {{ submission.rating }} ★
                  </span>
                  <span v-else class="text-text-muted">-</span>
                </td>
                <td class="px-4 py-2 text-[11px] text-text-secondary max-w-xs truncate">
                  {{ submission.comment || '-' }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-[11px]">
                  <button
                    @click="viewDetails(submission)"
                    class="text-accent-orange hover:text-accent-orange-hover"
                  >
                    View
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-4 py-2 border-t border-border-default flex items-center justify-between">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-2 py-1 text-[11px] border border-border-default rounded hover:bg-bg-hover disabled:opacity-50 text-text-secondary"
          >
            Previous
          </button>
          <span class="text-[11px] text-text-muted">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 text-[11px] border border-border-default rounded hover:bg-bg-hover disabled:opacity-50 text-text-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </template>

    <!-- Submission Detail Modal -->
    <Teleport to="body">
      <div
        v-if="selectedSubmission"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="selectedSubmission = null"
      >
        <div class="w-full max-w-xl bg-bg-secondary rounded-lg shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto border border-border-default">
          <div class="px-4 py-3 border-b border-border-default bg-bg-header flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-orange">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <h3 class="text-[14px] font-medium text-text-primary">Submission Details</h3>
            </div>
            <button @click="selectedSubmission = null" class="text-text-muted hover:text-text-primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-4 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div class="p-2 bg-bg-tertiary rounded border border-border-default">
                <label class="text-[10px] font-medium text-text-muted uppercase">Submitted</label>
                <p class="text-[12px] text-text-primary">{{ formatDateFull(selectedSubmission.createdAt) }}</p>
              </div>
              <div class="p-2 bg-bg-tertiary rounded border border-border-default">
                <label class="text-[10px] font-medium text-text-muted uppercase">User</label>
                <p class="text-[12px] text-text-primary">{{ selectedSubmission.userEmail || selectedSubmission.userId || 'Anonymous' }}</p>
              </div>
            </div>
            
            <div v-if="selectedSubmission.rating" class="p-2 bg-bg-tertiary rounded border border-border-default">
              <label class="text-[10px] font-medium text-text-muted uppercase">Rating</label>
              <p class="text-lg text-accent-yellow">{{ '★'.repeat(selectedSubmission.rating) }}</p>
            </div>
            
            <div v-if="selectedSubmission.comment" class="p-2 bg-bg-tertiary rounded border border-border-default">
              <label class="text-[10px] font-medium text-text-muted uppercase">Comment</label>
              <p class="text-[12px] text-text-primary whitespace-pre-wrap">{{ selectedSubmission.comment }}</p>
            </div>
            
            <div v-if="Object.keys(selectedSubmission.responses).length" class="p-2 bg-bg-tertiary rounded border border-border-default">
              <label class="text-[10px] font-medium text-text-muted uppercase">Responses</label>
              <div class="mt-1 space-y-1">
                <div
                  v-for="(value, key) in selectedSubmission.responses"
                  :key="key"
                  class="p-2 bg-bg-secondary rounded border border-border-default"
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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Submission {
  id: string;
  userId: string | null;
  userEmail: string | null;
  workspaceId: string | null;
  responses: Record<string, unknown>;
  rating: number | null;
  comment: string | null;
  createdAt: string;
  userAgent: string | null;
}

interface Analytics {
  totalSubmissions: number;
  averageRating: number | null;
  ratingDistribution: Record<number, number>;
  submissionsByDay: Array<{ date: string; count: number }>;
  submissionsByWorkspace: Array<{ workspaceId: string | null; count: number }>;
}

const filters = ref({
  startDate: '',
  endDate: ''
});

const submissions = ref<Submission[]>([]);
const analytics = ref<Analytics | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const currentPage = ref(1);
const itemsPerPage = 10;
const selectedSubmission = ref<Submission | null>(null);

const totalPages = computed(() => Math.ceil(submissions.value.length / itemsPerPage));

const paginatedSubmissions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return submissions.value.slice(start, start + itemsPerPage);
});

const hasRatings = computed(() => {
  return analytics.value?.ratingDistribution && Object.keys(analytics.value.ratingDistribution).length > 0;
});

const submissionsThisWeek = computed(() => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return submissions.value.filter(s => new Date(s.createdAt) >= weekAgo).length;
});

const responseRate = computed(() => {
  return Math.min(100, Math.round((analytics.value?.totalSubmissions || 0) * 2));
});

const fetchData = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    const params: Record<string, string> = {};
    if (filters.value.startDate) params.startDate = filters.value.startDate;
    if (filters.value.endDate) params.endDate = filters.value.endDate;
    
    const response = await $fetch<{
      submissions: Submission[];
      analytics: Analytics;
    }>('/api/admin/super/feedback/submissions', { params });
    
    submissions.value = response.submissions;
    analytics.value = response.analytics;
    currentPage.value = 1;
  } catch (e: any) {
    console.error('Failed to fetch feedback data:', e);
    error.value = 'Failed to load feedback data';
  } finally {
    isLoading.value = false;
  }
};

const applyFilters = () => {
  fetchData();
};

const exportData = () => {
  const csv = [
    ['Date', 'User', 'Email', 'Workspace', 'Rating', 'Comment', 'Responses'].join(','),
    ...submissions.value.map(s => [
      s.createdAt,
      s.userId || '',
      s.userEmail || '',
      s.workspaceId || '',
      s.rating || '',
      `"${(s.comment || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(s.responses).replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const getRatingPercentage = (rating: number): number => {
  if (!analytics.value?.totalSubmissions) return 0;
  const count = analytics.value.ratingDistribution[rating] || 0;
  return (count / analytics.value.totalSubmissions) * 100;
};

const maxDayCount = computed(() => {
  if (!analytics.value?.submissionsByDay?.length) return 1;
  return Math.max(...analytics.value.submissionsByDay.map(d => d.count));
});

const getDayHeight = (count: number): number => {
  if (maxDayCount.value === 0) return 0;
  return (count / maxDayCount.value) * 120;
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString();
};

const formatDateShort = (date: string): string => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateFull = (date: string): string => {
  return new Date(date).toLocaleString();
};

const viewDetails = (submission: Submission) => {
  selectedSubmission.value = submission;
};

onMounted(() => {
  fetchData();
});
</script>
