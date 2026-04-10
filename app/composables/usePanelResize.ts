import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

interface PanelResizeOptions {
  storageKey?: string;
  defaultSplit?: number; // 0-1, default 0.4 (40%)
  minHeight?: number; // px
  maxHeight?: number; // px
  collapsedHeight?: number; // px when collapsed
}

interface PanelResizeReturn {
  topHeight: Ref<number>;
  bottomHeight: Ref<number>;
  isCollapsed: Ref<boolean>;
  isResizing: Ref<boolean>;
  containerHeight: Ref<number>;
  isMobile: Ref<boolean>;
  mobileBreakpoint: number;
  startResize: (e: MouseEvent) => void;
  toggleCollapse: () => void;
  expand: () => void;
  collapse: () => void;
}

export function usePanelResize(
  containerRef: Ref<HTMLElement | null>,
  options: PanelResizeOptions = {}
): PanelResizeReturn {
  const {
    storageKey = 'panelSplitRatio',
    defaultSplit = 0.4,
    minHeight = 100,
    collapsedHeight = 45
  } = options;

  const containerHeight = ref(0);
  const splitRatio = ref(defaultSplit);
  const isCollapsed = ref(false);
  const isResizing = ref(false);
  const isMobile = ref(false);
  const mobileBreakpoint = 768;

  // Load saved preferences
  onMounted(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        splitRatio.value = data.ratio ?? defaultSplit;
        isCollapsed.value = data.collapsed ?? false;
      } catch {
        splitRatio.value = defaultSplit;
      }
    }
    
    updateContainerHeight();
    checkMobile();
    
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('mousemove', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleWindowResize);
    window.removeEventListener('wheel', handleWheel);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('mousemove', handleResize);
  });

  // Computed heights
  const topHeight = computed(() => {
    if (isMobile.value) return containerHeight.value;
    if (isCollapsed.value) return containerHeight.value - collapsedHeight;
    return Math.round(containerHeight.value * splitRatio.value);
  });

  const bottomHeight = computed(() => {
    if (isMobile.value) return 0;
    if (isCollapsed.value) return collapsedHeight;
    return containerHeight.value - topHeight.value;
  });

  // Save preferences
  const savePreferences = () => {
    localStorage.setItem(storageKey, JSON.stringify({
      ratio: splitRatio.value,
      collapsed: isCollapsed.value
    }));
  };

  // Watch for changes
  watch([splitRatio, isCollapsed], savePreferences, { deep: true });

  // Resize handlers
  function updateContainerHeight() {
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect();
      containerHeight.value = rect.height;
    }
  }

  function checkMobile() {
    isMobile.value = window.innerWidth < mobileBreakpoint;
  }

  function handleWindowResize() {
    updateContainerHeight();
    checkMobile();
  }

  function startResize(e: MouseEvent) {
    if (isMobile.value) return;
    isResizing.value = true;
    e.preventDefault();
  }

  function handleResize(e: MouseEvent) {
    if (!isResizing.value || !containerRef.value || isMobile.value) return;
    
    const rect = containerRef.value.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const newRatio = Math.max(minHeight / containerHeight.value, 
                              Math.min(1 - (minHeight / containerHeight.value), 
                                       relativeY / containerHeight.value));
    
    splitRatio.value = newRatio;
  }

  function stopResize() {
    isResizing.value = false;
  }

  // Option + Scroll resize
  function handleWheel(e: WheelEvent) {
    // Check for Alt/Option key
    if (!e.altKey || isMobile.value) return;
    
    // Only if mouse is over the container
    if (!containerRef.value) return;
    
    const rect = containerRef.value.getBoundingClientRect();
    const isOverContainer = e.clientY >= rect.top && e.clientY <= rect.bottom &&
                            e.clientX >= rect.left && e.clientX <= rect.right;
    
    if (!isOverContainer) return;
    
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.02 : -0.02;
    const newRatio = Math.max(minHeight / containerHeight.value,
                              Math.min(1 - (minHeight / containerHeight.value),
                                       splitRatio.value + delta));
    
    splitRatio.value = newRatio;
  }

  // Collapse/Expand
  function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value;
  }

  function collapse() {
    isCollapsed.value = true;
  }

  function expand() {
    isCollapsed.value = false;
  }

  return {
    topHeight,
    bottomHeight,
    isCollapsed,
    isResizing,
    containerHeight,
    isMobile,
    mobileBreakpoint,
    startResize,
    toggleCollapse,
    expand,
    collapse
  };
}
