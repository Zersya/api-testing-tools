import { invoke } from '@tauri-apps/api/core';

// Types
export interface UpdateInfo {
  version: string;
  current_version: string;
  body: string;
  date: string;
}

export interface UpdaterState {
  checking: boolean;
  available: boolean;
  info: UpdateInfo | null;
  error: string | null;
}

// Reactive state
const state = reactive<UpdaterState>({
  checking: false,
  available: false,
  info: null,
  error: null
});

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<boolean> {
  // Only check in Tauri
  if (!isTauri()) {
    console.log('[Updater] Not in Tauri, skipping update check');
    return false;
  }

  state.checking = true;
  state.error = null;

  try {
    const update = await invoke<UpdateInfo | null>('check_update');

    if (update) {
      state.available = true;
      state.info = update;
      console.log('[Updater] Update available:', update.version);
      return true;
    } else {
      state.available = false;
      state.info = null;
      console.log('[Updater] No updates available');
      return false;
    }
  } catch (e: any) {
    state.error = e.message || 'Failed to check for updates';
    console.error('[Updater] Error:', e);
    return false;
  } finally {
    state.checking = false;
  }
}

/**
 * Install the available update
 */
export async function installUpdate(): Promise<void> {
  if (!state.available || !isTauri()) {
    throw new Error('No update available');
  }

  try {
    await invoke('install_update');
    // App will restart automatically
  } catch (e: any) {
    state.error = e.message || 'Failed to install update';
    console.error('[Updater] Install error:', e);
    throw e;
  }
}

/**
 * Check if running in Tauri
 */
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
}

/**
 * Get the updater state (for reactive use in components)
 */
export function useUpdaterState() {
  return {
    state: readonly(state),
    checkForUpdates,
    installUpdate
  };
}

/**
 * Auto-check for updates on app startup
 * @param intervalHours - Hours between automatic checks (default: 24)
 */
export function initAutoUpdate(intervalHours: number = 24): void {
  if (!isTauri()) return;

  // Check on startup (after a short delay)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Periodic checks
  setInterval(() => {
    checkForUpdates();
  }, intervalHours * 60 * 60 * 1000);
}
