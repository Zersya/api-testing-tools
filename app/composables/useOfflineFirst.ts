/**
 * Unified Data Composable
 * Automatically switches between local store (desktop) and API calls (web)
 */

import { ref, computed } from 'vue';
import { isDesktop, initLocalStore, getAuthToken, getUser } from '~/services/local-store';
import * as dataService from '~/services/data-service';
import { syncWithServer, startAutoSync, stopAutoSync } from '~/services/sync-service';
import { safeArray } from '~/utils/safeArray';

// Unified workspaces composable
export function useWorkspaces() {
  const workspaces = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const safeWorkspaces = computed(() => safeArray(workspaces.value));

  async function fetchWorkspaces() {
    isLoading.value = true;
    error.value = null;

    try {
      if (isDesktop()) {
        await initLocalStore();
        workspaces.value = await dataService.getWorkspaces();
      } else {
        const response = await $fetch<any[]>('/api/admin/tree');
        if (Array.isArray(response)) {
          workspaces.value = response;
        } else {
          console.warn('API returned non-array response:', response);
          workspaces.value = [];
          error.value = typeof response === 'string' ? response : 'Unknown error';
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch workspaces:', e);
      error.value = e.message || 'Failed to fetch workspaces';
    } finally {
      isLoading.value = false;
    }
  }

  async function createWorkspace(name: string, description?: string) {
    try {
      if (isDesktop()) {
        const workspace = await dataService.createWorkspace(name, description);
        workspaces.value = [...workspaces.value, workspace];
        return workspace;
      } else {
        const response = await $fetch<any>('/api/admin/workspaces', {
          method: 'POST',
          body: { name, description },
        });
        await fetchWorkspaces();
        return response;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to create workspace';
      throw e;
    }
  }

  async function updateWorkspace(id: string, updates: { name?: string; description?: string }) {
    try {
      if (isDesktop()) {
        const updated = await dataService.updateWorkspace(id, updates);
        workspaces.value = workspaces.value.map(w => w.id === id ? updated : w);
        return updated;
      } else {
        const response = await $fetch<any>(`/api/admin/workspaces/${id}`, {
          method: 'PUT',
          body: updates,
        });
        await fetchWorkspaces();
        return response;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to update workspace';
      throw e;
    }
  }

  async function deleteWorkspace(id: string) {
    try {
      if (isDesktop()) {
        await dataService.deleteWorkspace(id);
        workspaces.value = workspaces.value.filter(w => w.id !== id);
      } else {
        await $fetch(`/api/admin/workspaces/${id}`, { method: 'DELETE' });
        await fetchWorkspaces();
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to delete workspace';
      throw e;
    }
  }

  return {
    workspaces,
    safeWorkspaces,
    isLoading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}

// Unified projects composable
export function useProjects(workspaceId: string) {
  const projects = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function createProject(name: string) {
    try {
      if (isDesktop()) {
        const project = await dataService.createProject(workspaceId, name);
        projects.value = [...projects.value, project];
        return project;
      } else {
        const response = await $fetch<any>(`/api/admin/workspaces/${workspaceId}/projects`, {
          method: 'POST',
          body: { name },
        });
        return response;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to create project';
      throw e;
    }
  }

  return {
    projects,
    isLoading,
    error,
    createProject,
  };
}

// Unified collections composable
export function useCollections(projectId: string) {
  const collections = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function createCollection(name: string, description?: string, color?: string) {
    try {
      if (isDesktop()) {
        const collection = await dataService.createCollection(projectId, name, description, color);
        collections.value = [...collections.value, collection];
        return collection;
      } else {
        const response = await $fetch<any>(`/api/admin/projects/${projectId}/collections`, {
          method: 'POST',
          body: { name, description, color },
        });
        return response;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to create collection';
      throw e;
    }
  }

  return {
    collections,
    isLoading,
    error,
    createCollection,
  };
}

// Unified folders composable
export function useFolders(collectionId: string) {
  const folders = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function createFolder(name: string, parentFolderId?: string) {
    try {
      if (isDesktop()) {
        const folder = await dataService.createFolder(collectionId, name, parentFolderId);
        folders.value = [...folders.value, folder];
        return folder;
      } else {
        const response = await $fetch<any>(`/api/admin/collections/${collectionId}/folders`, {
          method: 'POST',
          body: { name, parentFolderId },
        });
        return response;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to create folder';
      throw e;
    }
  }

  return {
    folders,
    isLoading,
    error,
    createFolder,
  };
}

// Unified requests composable
export function useRequests() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function createRequest(folderId: string, request: any) {
    try {
      if (isDesktop()) {
        return await dataService.createRequest(folderId, request);
      } else {
        return await $fetch<any>(`/api/admin/folders/${folderId}/requests`, {
          method: 'POST',
          body: request,
        });
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to create request';
      throw e;
    }
  }

  async function updateRequest(id: string, updates: any) {
    try {
      if (isDesktop()) {
        return await dataService.updateRequest(id, updates);
      } else {
        return await $fetch<any>(`/api/admin/requests/${id}`, {
          method: 'PUT',
          body: updates,
        });
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to update request';
      throw e;
    }
  }

  async function deleteRequest(id: string) {
    try {
      if (isDesktop()) {
        return await dataService.deleteRequest(id);
      } else {
        return await $fetch(`/api/admin/requests/${id}`, { method: 'DELETE' });
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to delete request';
      throw e;
    }
  }

  return {
    isLoading,
    error,
    createRequest,
    updateRequest,
    deleteRequest,
  };
}

// Unified auth composable
export function useAuth() {
  const isAuthenticated = ref(false);
  const user = ref<any>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function checkAuth() {
    try {
      if (isDesktop()) {
        await initLocalStore();
        const token = await getAuthToken();
        const userData = await getUser();
        isAuthenticated.value = !!token;
        user.value = userData;
      } else {
        await $fetch('/api/auth/check');
        isAuthenticated.value = true;
      }
    } catch (e) {
      isAuthenticated.value = false;
      user.value = null;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    error.value = null;

    try {
      if (isDesktop()) {
        const { initLocalStore, setAuthToken } = await import('~/services/local-store');
        const { tauriFetch } = await import('~/services/tauri-api');
        
        await initLocalStore();
        
        // Use Rust Proxy to bypass CORS/Network restrictions
        const response = await tauriFetch<any>('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { email, password }, // tauriFetch handles JSON stringification
        });

        if (!response.success) {
          throw new Error(response.error || 'Invalid credentials');
        }

        const data = response.data;
        // Ensure data is an object (Rust might return parsed JSON or string depending on implementation)
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

        await setAuthToken(parsedData.token, parsedData.user);
        isAuthenticated.value = true;
        user.value = parsedData.user;

        startAutoSync();
        await syncWithServer();

        return true;
      } else {
        await $fetch('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        isAuthenticated.value = true;
        return true;
      }
    } catch (e: any) {
      error.value = e.message || 'Login failed';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    try {
      if (isDesktop()) {
        const { clearAuth } = await import('~/services/local-store');
        await clearAuth();
        stopAutoSync();
      } else {
        await $fetch('/api/auth/logout', { method: 'POST' });
      }
      isAuthenticated.value = false;
      user.value = null;
    } catch (e: any) {
      console.error('Logout error:', e);
    }
  }

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    checkAuth,
    login,
    logout,
  };
}


