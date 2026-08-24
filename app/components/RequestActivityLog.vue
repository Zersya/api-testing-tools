<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { formatDateTime, getClientTimeZone } from '../utils/format-datetime';

type ActivityEventType = 'request_create' | 'request_update';

interface RequestActivityEvent {
  id: string;
  eventType: ActivityEventType;
  userId: string;
  userEmail: string;
  resourceName: string | null;
  timestamp: string;
}

interface ActivityResponse {
  events: RequestActivityEvent[];
  total: number;
}

interface Props {
  requestId: string;
  refreshToken?: number;
}

const props = defineProps<Props>();

const events = ref<RequestActivityEvent[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const clientTimeZone = computed(() => getClientTimeZone());

const eventLabels: Record<ActivityEventType, string> = {
  request_create: 'Created',
  request_update: 'Updated',
};

const eventBadgeClasses: Record<ActivityEventType, string> = {
  request_create: 'bg-accent-green/15 text-accent-green',
  request_update: 'bg-accent-yellow/15 text-accent-yellow',
};

const fetchActivity = async () => {
  if (!props.requestId) {
    events.value = [];
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const response = await $fetch<ActivityResponse>(`/api/admin/requests/${props.requestId}/activity`);
    events.value = response.events;
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.message || 'Failed to load activity';
    events.value = [];
    console.error('Error fetching request activity:', err);
  } finally {
    isLoading.value = false;
  }
};

watch(() => props.requestId, fetchActivity);
watch(() => props.refreshToken, fetchActivity);

onMounted(fetchActivity);
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="px-4 py-2.5 border-b border-border-default bg-bg-secondary flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-xs font-semibold text-text-primary">Activity</h3>
        <p class="text-[11px] text-text-muted mt-0.5 truncate">
          Creation and update history
          <span class="text-text-muted/80">· {{ clientTimeZone }}</span>
        </p>
      </div>
      <span
        v-if="!isLoading && events.length > 0"
        class="shrink-0 text-[11px] text-text-muted tabular-nums"
      >
        {{ events.length }} {{ events.length === 1 ? 'event' : 'events' }}
      </span>
    </div>

    <div class="flex-1 overflow-auto">
      <div v-if="isLoading" class="p-6 space-y-3">
        <div
          v-for="index in 3"
          :key="index"
          class="h-14 rounded-md bg-bg-tertiary animate-pulse"
        />
      </div>

      <div v-else-if="error" class="p-6 text-center">
        <p class="text-[13px] text-accent-red m-0">{{ error }}</p>
        <button
          type="button"
          class="mt-3 text-[12px] text-accent-blue hover:text-accent-blue/80 transition-colors duration-fast"
          @click="fetchActivity"
        >
          Try again
        </button>
      </div>

      <div v-else-if="events.length === 0" class="p-8 text-center">
        <div class="w-10 h-10 mx-auto mb-3 rounded-full bg-bg-tertiary flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="text-text-muted">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <p class="text-[13px] text-text-secondary m-0">No activity recorded yet</p>
        <p class="text-[11px] text-text-muted mt-1.5 m-0 max-w-[280px] mx-auto leading-relaxed">
          Saves and edits to this request will appear here with exact timestamps in your local timezone.
        </p>
      </div>

      <ol v-else class="p-4 m-0 list-none space-y-0">
        <li
          v-for="(entry, index) in events"
          :key="entry.id"
          class="relative pl-7 pb-5 last:pb-2"
        >
          <span
            v-if="index < events.length - 1"
            class="absolute left-[9px] top-5 bottom-0 w-px bg-border-default"
            aria-hidden="true"
          />

          <span
            class="absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full border border-border-default bg-bg-secondary flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="entry.eventType === 'request_create' ? 'bg-accent-green' : 'bg-accent-yellow'"
            />
          </span>

          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
                :class="eventBadgeClasses[entry.eventType]"
              >
                {{ eventLabels[entry.eventType] }}
              </span>
              <span
                v-if="entry.resourceName"
                class="text-[11px] text-text-muted truncate max-w-[220px]"
                :title="entry.resourceName"
              >
                {{ entry.resourceName }}
              </span>
            </div>

            <time
              :datetime="entry.timestamp"
              class="block text-[12px] font-mono text-text-primary tabular-nums"
              :title="entry.timestamp"
            >
              {{ formatDateTime(entry.timestamp) }}
            </time>

            <p class="text-[11px] text-text-muted mt-1 m-0 truncate" :title="entry.userEmail">
              by {{ entry.userEmail }}
            </p>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>
