<template>
  <div class="min-h-screen bg-bg-primary">
    <div class="max-w-7xl mx-auto px-4 py-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Error Analytics</h1>
        <p class="text-text-secondary mt-1">Monitor and analyze production errors</p>
      </div>

      <!-- Date Range Filter -->
      <div class="mb-6 flex gap-4 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-secondary">Start Date:</label>
          <input
            v-model="startDate"
            type="date"
            class="px-3 py-2 bg-bg-secondary border border-border-default rounded-md text-text-primary text-sm"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-secondary">End Date:</label>
          <input
            v-model="endDate"
            type="date"
            class="px-3 py-2 bg-bg-secondary border border-border-default rounded-md text-text-primary text-sm"
          />
        </div>
        <button
          @click="fetchAnalytics"
          class="px-4 py-2 bg-accent-orange text-white rounded-md hover:bg-accent-orange-hover text-sm"
        >
          Apply
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6" v-if="analytics">
        <div class="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div class="text-text-muted text-xs uppercase mb-1">Total Errors</div>
          <div class="text-2xl font-bold text-accent-red">{{ totalErrors }}</div>
        </div>
        <div class="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div class="text-text-muted text-xs uppercase mb-1">Critical</div>
          <div class="text-2xl font-bold text-accent-orange">{{ criticalErrors }}</div>
        </div>
        <div class="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div class="text-text-muted text-xs uppercase mb-1">Affected Users</div>
          <div class="text-2xl font-bold text-text-primary">{{ affectedUsers }}</div>
        </div>
        <div class="bg-bg-secondary border border-border-default rounded-lg p-4">
          <div class="text-text-muted text-xs uppercase mb-1">Affected Workspaces</div>
          <div class="text-2xl font-bold text-text-primary">{{ affectedWorkspaces }}</div>
        </div>
      </div>

      <!-- Error Trend Chart -->
      <div class="bg-bg-secondary border border-border-default rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Error Trend</h2>
        <div class="h-64 flex items-end gap-1">
          <div
            v-for="trend in errorTrends"
            :key="trend.date"
            class="flex-1 bg-accent-red rounded-t transition-all hover:bg-accent-red-hover"
            :style="{ height: getBarHeight(trend.count) + '%' }"
            :title="`${trend.date}: ${trend.count} errors`"
          ></div>
        </div>
        <div class="flex justify-between mt-2 text-xs text-text-muted">
          <span>{{ startDate }}</span>
          <span>{{ endDate }}</span>
        </div>
      </div>

      <!-- Error Types Breakdown -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-bg-secondary border border-border-default rounded-lg p-6">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Error Types</h2>
          <div class="space-y-3">
            <div
              v-for="item in errorTypeBreakdown"
              :key="item.type"
              class="flex items-center justify-between"
            >
              <span class="text-sm text-text-primary">{{ item.type }}</span>
              <div class="flex items-center gap-3">
                <div class="w-32 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    class="h-full bg-accent-orange transition-all"
                    :style="{ width: item.percentage + '%' }"
                  ></div>
                </div>
                <span class="text-sm text-text-secondary w-12 text-right">{{ item.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-bg-secondary border border-border-default rounded-lg p-6">
          <h2 class="text-lg font-semibold text-text-primary mb-4">Top Affected Users</h2>
          <div class="space-y-3">
            <div
              v-for="user in topAffectedUsers"
              :key="user.userId"
              class="flex items-center justify-between"
            >
              <span class="text-sm text-text-primary">{{ user.userEmail }}</span>
              <span class="text-sm text-accent-red font-medium">{{ user.errorCount }} errors</span>
            </div>
            <div v-if="topAffectedUsers.length === 0" class="text-text-muted text-sm">
              No errors recorded
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Errors Table -->
      <div class="bg-bg-secondary border border-border-default rounded-lg p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">Recent Errors</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border-default">
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Timestamp</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Type</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Message</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">User</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Route</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Severity</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Status</th>
                <th class="text-left text-xs font-medium text-text-secondary uppercase tracking-wide pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="error in recentErrors"
                :key="error.id"
                class="border-b border-border-default hover:bg-bg-hover"
              >
                <td class="py-3 text-sm text-text-secondary">
                  {{ formatTimestamp(error.createdAt) }}
                </td>
                <td class="py-3 text-sm text-text-primary">
                  {{ error.errorType }}
                </td>
                <td class="py-3 text-sm text-text-primary max-w-xs truncate">
                  {{ error.errorMessage }}
                </td>
                <td class="py-3 text-sm text-text-secondary">
                  {{ error.userEmail || 'Anonymous' }}
                </td>
                <td class="py-3 text-sm text-text-secondary">
                  {{ error.route || '-' }}
                </td>
                <td class="py-3">
                  <span
                    :class="[
                      'text-xs px-2 py-1 rounded',
                      error.errorSeverity === 'critical' ? 'bg-accent-red/20 text-accent-red' :
                      error.errorSeverity === 'warning' ? 'bg-accent-orange/20 text-accent-orange' :
                      'bg-bg-tertiary text-text-secondary'
                    ]"
                  >
                    {{ error.errorSeverity }}
                  </span>
                </td>
                <td class="py-3">
                  <span
                    :class="[
                      'text-xs px-2 py-1 rounded',
                      error.status === 'resolved' ? 'bg-green-500/20 text-green-500' :
                      error.status === 'investigating' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-bg-tertiary text-text-secondary'
                    ]"
                  >
                    {{ error.status }}
                  </span>
                </td>
                <td class="py-3">
                  <button
                    @click="viewErrorDetails(error)"
                    class="text-accent-orange hover:text-accent-orange-hover text-sm"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Error Details Modal -->
      <Modal v-model="showErrorModal">
        <div v-if="selectedError" class="p-6">
          <h3 class="text-lg font-semibold text-text-primary mb-4">Error Details</h3>
          
          <div class="space-y-4">
            <div>
              <div class="text-xs text-text-muted uppercase mb-1">Message</div>
              <div class="text-sm text-text-primary">{{ selectedError.errorMessage }}</div>
            </div>
            
            <div v-if="selectedError.errorStack">
              <div class="text-xs text-text-muted uppercase mb-1">Stack Trace</div>
              <pre class="text-xs text-text-secondary bg-bg-tertiary p-3 rounded overflow-x-auto max-h-48">{{ selectedError.errorStack }}</pre>
            </div>
            
            <div>
              <div class="text-xs text-text-muted uppercase mb-1">Context</div>
              <pre class="text-xs text-text-secondary bg-bg-tertiary p-3 rounded overflow-x-auto max-h-48">{{ JSON.stringify(selectedError.context, null, 2) }}</pre>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-xs text-text-muted uppercase mb-1">Datadog Error ID</div>
                <div class="text-sm text-text-primary">{{ selectedError.datadogErrorId || '-' }}</div>
              </div>
              <div>
                <div class="text-xs text-text-muted uppercase mb-1">Session ID</div>
                <div class="text-sm text-text-primary">{{ selectedError.datadogSessionId || '-' }}</div>
              </div>
            </div>
            
            <div>
              <div class="text-xs text-text-muted uppercase mb-1">Browser</div>
              <div class="text-sm text-text-secondary">{{ selectedError.userAgent }}</div>
            </div>
          </div>
          
          <div class="mt-6 flex gap-2">
            <a
              v-if="selectedError.datadogErrorId"
              :href="`https://us5.datadoghq.com/rum/sessions/${selectedError.datadogSessionId}`"
              target="_blank"
              class="px-4 py-2 bg-accent-orange text-white rounded-md hover:bg-accent-orange-hover text-sm"
            >
              View in Datadog
            </a>
            <button
              @click="showErrorModal = false"
              class="px-4 py-2 bg-bg-tertiary text-text-primary rounded-md hover:bg-bg-hover text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Modal from '~/components/Modal.vue'
import { useApiClient } from '~~/composables/useApiFetch'

const startDate = ref(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
const endDate = ref(new Date().toISOString().split('T')[0])

interface Analytics {
  summary: Array<{
    errorType: string
    severity: string
    status: string
    count: number
  }>
  recentErrors: Array<any>
  trends: Array<{ date: string; count: number }>
  topAffectedUsers: Array<{ userId: string; userEmail: string; errorCount: number }>
  topAffectedWorkspaces: Array<{ workspaceId: string; errorCount: number }>
  dateRange: { start: string; end: string }
}

const analytics = ref<Analytics | null>(null)
const showErrorModal = ref(false)
const selectedError = ref<any>(null)

const totalErrors = computed(() => {
  return analytics.value?.summary.reduce((sum, item) => sum + item.count, 0) || 0
})

const criticalErrors = computed(() => {
  return analytics.value?.summary
    .filter(item => item.severity === 'critical')
    .reduce((sum, item) => sum + item.count, 0) || 0
})

const affectedUsers = computed(() => {
  return analytics.value?.topAffectedUsers.length || 0
})

const affectedWorkspaces = computed(() => {
  return analytics.value?.topAffectedWorkspaces.length || 0
})

const errorTrends = computed(() => {
  return analytics.value?.trends || []
})

const errorTypeBreakdown = computed(() => {
  if (!analytics.value?.summary) return []
  
  const typeMap = new Map<string, number>()
  analytics.value.summary.forEach(item => {
    const current = typeMap.get(item.errorType) || 0
    typeMap.set(item.errorType, current + item.count)
  })
  
  const total = Array.from(typeMap.values()).reduce((sum, count) => sum + count, 0)
  
  return Array.from(typeMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

const topAffectedUsers = computed(() => {
  return analytics.value?.topAffectedUsers || []
})

const recentErrors = computed(() => {
  return analytics.value?.recentErrors || []
})

const api = useApiClient()

const fetchAnalytics = async () => {
  try {
    const response = await api.get<Analytics>('/api/analytics/errors', {
      query: {
        startDate: startDate.value,
        endDate: endDate.value,
      },
    })
    analytics.value = response
  } catch (error) {
    console.error('Failed to fetch error analytics:', error)
  }
}

const getBarHeight = (count: number) => {
  if (!analytics.value?.trends) return 0
  const maxCount = Math.max(...analytics.value.trends.map(t => t.count))
  return maxCount > 0 ? (count / maxCount) * 100 : 0
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

const viewErrorDetails = (error: any) => {
  selectedError.value = error
  showErrorModal.value = true
}

onMounted(() => {
  fetchAnalytics()
})
</script>
