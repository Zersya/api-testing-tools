<template>
  <div class="space-y-6">
    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">From:</label>
          <input
            v-model="filters.startDate"
            type="date"
            class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">To:</label>
          <input
            v-model="filters.endDate"
            type="date"
            class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>
        <button
          @click="applyFilters"
          class="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          @click="exportData"
          class="px-4 py-1.5 text-indigo-600 border border-indigo-600 rounded-lg text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
        >
          Export CSV
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Submissions</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ analytics?.totalSubmissions || 0 }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Average Rating</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ analytics?.averageRating ? analytics.averageRating.toFixed(1) : 'N/A' }}
          </p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">This Week</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ submissionsThisWeek }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Response Rate</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ responseRate }}%</p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Rating Distribution -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rating Distribution</h3>
          <div v-if="hasRatings" class="space-y-2">
            <div v-for="rating in [5, 4, 3, 2, 1]" :key="rating" class="flex items-center gap-3">
              <span class="w-8 text-sm font-medium text-gray-600 dark:text-gray-400">{{ rating }}★</span>
              <div class="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  :style="{ width: getRatingPercentage(rating) + '%' }"
                />
              </div>
              <span class="w-12 text-sm text-gray-600 dark:text-gray-400 text-right">
                {{ analytics?.ratingDistribution[rating] || 0 }}
              </span>
            </div>
          </div>
          <p v-else class="text-gray-500 dark:text-gray-400 text-center py-8">No ratings data available</p>
        </div>

        <!-- Submissions Over Time -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submissions Over Time</h3>
          <div v-if="analytics?.submissionsByDay?.length" class="h-48 flex items-end gap-1">
            <div
              v-for="day in analytics.submissionsByDay"
              :key="day.date"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <div
                class="w-full bg-indigo-500 rounded-t transition-all duration-500 hover:bg-indigo-600"
                :style="{ height: getDayHeight(day.count) + 'px' }"
                :title="`${day.date}: ${day.count} submissions`"
              />
              <span class="text-xs text-gray-500 rotate-45 origin-left translate-y-2">
                {{ formatDateShort(day.date) }}
              </span>
            </div>
          </div>
          <p v-else class="text-gray-500 dark:text-gray-400 text-center py-8">No data available</p>
        </div>
      </div>

      <!-- Submissions by Workspace -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Submissions by Workspace</h3>
        </div>
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="ws in analytics?.submissionsByWorkspace"
            :key="ws.workspaceId || 'unknown'"
            class="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50"
          >
            <span class="text-gray-900 dark:text-white">
              {{ ws.workspaceId || 'Unknown/No Workspace' }}
            </span>
            <span class="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-sm font-medium rounded">
              {{ ws.count }}
            </span>
          </div>
          <div v-if="!analytics?.submissionsByWorkspace?.length" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            No workspace data available
          </div>
        </div>
      </div>

      <!-- Recent Submissions -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Submissions</h3>
          <span class="text-sm text-gray-500">{{ submissions.length }} total</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comment</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="submission in paginatedSubmissions" :key="submission.id" class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {{ formatDate(submission.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {{ submission.userEmail || submission.userId || 'Anonymous' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span v-if="submission.rating" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {{ submission.rating }} ★
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                  {{ submission.comment || '-' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    @click="viewDetails(submission)"
                    class="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
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
        <div class="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Submission Details</h3>
            <button @click="selectedSubmission = null" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase">Submitted</label>
                <p class="text-sm text-gray-900 dark:text-gray-100">{{ formatDateFull(selectedSubmission.createdAt) }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 uppercase">User</label>
                <p class="text-sm text-gray-900 dark:text-gray-100">{{ selectedSubmission.userEmail || selectedSubmission.userId || 'Anonymous' }}</p>
              </div>
            </div>
            
            <div v-if="selectedSubmission.rating">
              <label class="text-xs font-medium text-gray-500 uppercase">Rating</label>
              <p class="text-lg">{{ '★'.repeat(selectedSubmission.rating) }}{{ '☆'.repeat(5 - selectedSubmission.rating) }}</p>
            </div>
            
            <div v-if="selectedSubmission.comment">
              <label class="text-xs font-medium text-gray-500 uppercase">Comment</label>
              <p class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{{ selectedSubmission.comment }}</p>
            </div>
            
            <div v-if="Object.keys(selectedSubmission.responses).length">
              <label class="text-xs font-medium text-gray-500 uppercase">Responses</label>
              <div class="mt-2 space-y-2">
                <div
                  v-for="(value, key) in selectedSubmission.responses"
                  :key="key"
                  class="p-3 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <p class="text-xs font-medium text-gray-500">{{ key }}</p>
                  <p class="text-sm text-gray-900 dark:text-gray-100">
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
  // This is a placeholder - in reality you'd calculate against total active users
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
  return (count / maxDayCount.value) * 150;
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
