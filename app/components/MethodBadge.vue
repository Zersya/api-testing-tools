<script setup lang="ts">
interface Props {
  method: string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
});

const badgeClass = computed(() => {
  const base = 'method-badge';
  const sizeClass = `method-badge--${props.size}`;
  const methodClass = `method-badge--${props.method.toLowerCase()}`;
  return `${base} ${sizeClass} ${methodClass}`;
});
</script>

<template>
  <span :class="badgeClass">{{ method }}</span>
</template>

<style scoped>
.method-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  font-family: var(--font-sans);
}

/* Sizes */
.method-badge--sm {
  font-size: 9px;
  padding: 2px 6px;
  min-width: 40px;
}

.method-badge--md {
  font-size: 11px;
  padding: 3px 8px;
  min-width: 52px;
}

.method-badge--lg {
  font-size: 12px;
  padding: 4px 10px;
  min-width: 60px;
}

/* Method Colors */
.method-badge--get {
  background-color: rgba(115, 191, 105, 0.15);
  color: #73BF69;
}

.method-badge--post {
  background-color: rgba(255, 202, 40, 0.15);
  color: #FFCA28;
}

.method-badge--put {
  background-color: rgba(100, 181, 246, 0.15);
  color: #64B5F6;
}

.method-badge--delete {
  background-color: rgba(239, 83, 80, 0.15);
  color: #EF5350;
}

.method-badge--patch {
  background-color: rgba(171, 71, 188, 0.15);
  color: #AB47BC;
}
</style>
