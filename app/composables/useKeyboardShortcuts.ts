import { ref, onMounted, onUnmounted } from 'vue';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: string;
}

export interface ShortcutCallbacks {
  onSendRequest?: () => void;
  onSaveRequest?: () => void;
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onFocusUrl?: () => void;
  onToggleHelp?: () => void;
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  const isHelpVisible = ref(false);
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      ctrl: true,
      meta: true,
      description: 'Send request',
      category: 'Request'
    },
    {
      key: 's',
      ctrl: true,
      meta: true,
      description: 'Save request',
      category: 'Request'
    },
    {
      key: 'n',
      ctrl: true,
      meta: true,
      description: 'New request tab',
      category: 'Tabs'
    },
    {
      key: 'w',
      ctrl: true,
      meta: true,
      description: 'Close current tab',
      category: 'Tabs'
    },
    {
      key: 'l',
      ctrl: true,
      meta: true,
      description: 'Focus URL input',
      category: 'Navigation'
    },
    {
      key: '?',
      ctrl: true,
      meta: true,
      description: 'Show keyboard shortcuts',
      category: 'General'
    }
  ];

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      const isMacLike = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierPressed = isMacLike ? event.metaKey : event.ctrlKey;

      if (event.key === 'Escape' && isHelpVisible.value) {
        event.preventDefault();
        isHelpVisible.value = false;
        return;
      }

      if (modifierPressed && event.key === '?') {
        if (event.target.closest('.modal-overlay')) return;
        event.preventDefault();
        isHelpVisible.value = !isHelpVisible.value;
        return;
      }

      return;
    }

    const isMacLike = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlPressed = event.ctrlKey;
    const metaPressed = event.metaKey;
    const modifierPressed = ctrlPressed || metaPressed;

    if (event.key === 'Escape') {
      if (isHelpVisible.value) {
        event.preventDefault();
        isHelpVisible.value = false;
      }
      return;
    }

    if (modifierPressed) {
      switch (event.key.toLowerCase()) {
        case 'enter':
          event.preventDefault();
          callbacks.onSendRequest?.();
          break;
        case 's':
          event.preventDefault();
          if (!event.shiftKey) {
            callbacks.onSaveRequest?.();
          }
          break;
        case 'n':
          event.preventDefault();
          callbacks.onNewTab?.();
          break;
        case 'w':
          event.preventDefault();
          callbacks.onCloseTab?.();
          break;
        case 'l':
          event.preventDefault();
          callbacks.onFocusUrl?.();
          break;
        case '?':
          event.preventDefault();
          isHelpVisible.value = !isHelpVisible.value;
          break;
      }
    }
  };

  const showHelp = () => {
    isHelpVisible.value = true;
  };

  const hideHelp = () => {
    isHelpVisible.value = false;
  };

  const toggleHelp = () => {
    isHelpVisible.value = !isHelpVisible.value;
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  return {
    isHelpVisible,
    shortcuts,
    showHelp,
    hideHelp,
    toggleHelp
  };
}

export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.meta) parts.push('⌘');
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.alt || shortcut.key.length === 1 && shortcut.key !== shortcut.key.toUpperCase()) parts.push('⌥');
  if (shortcut.shift) parts.push('⇧');

  if (shortcut.key.length === 1) {
    parts.push(shortcut.key.toUpperCase());
  } else {
    parts.push(shortcut.key);
  }

  return parts.join(' + ');
}
