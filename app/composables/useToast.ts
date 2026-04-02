/**
 * Simple toast notification composable
 * Used for showing temporary success/error messages
 */

interface ToastOptions {
  duration?: number;
}

const toastState = ref<{
  show: boolean;
  message: string;
  type: 'success' | 'error';
}>({
  show: false,
  message: '',
  type: 'success'
});

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export const useToast = () => {
  const showToast = (message: string, type: 'success' | 'error' = 'success', options: ToastOptions = {}) => {
    const { duration = 3000 } = options;
    
    // Clear existing timeout
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    
    // Show new toast
    toastState.value = {
      show: true,
      message,
      type
    };
    
    // Auto dismiss
    toastTimeout = setTimeout(() => {
      toastState.value.show = false;
    }, duration);
  };
  
  const hideToast = () => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    toastState.value.show = false;
  };
  
  return {
    toastState: readonly(toastState),
    showToast,
    hideToast
  };
};
