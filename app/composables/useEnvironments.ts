import { ref, computed, watch } from 'vue';
import { useApiClient } from './useApiFetch';

interface Environment {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  variables: Variable[];
}

interface Variable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  environmentId: string;
}

interface WorkspaceEnvironments {
  environments: Environment[];
  activeEnvironmentId: string | null;
}

const STORAGE_KEY = 'mock-service-active-environment';

export function useEnvironments() {
  const api = useApiClient();
  const environments = ref<Environment[]>([]);
  const activeEnvironmentId = ref<string | null>(null);
  const loading = ref(false);

  const activeEnvironment = computed(() => {
    return environments.value.find(e => e.id === activeEnvironmentId.value) || null;
  });

  const variables = computed(() => {
    if (!activeEnvironment.value) return [];
    return activeEnvironment.value.variables || [];
  });

  const variableMap = computed(() => {
    const map: Record<string, string> = {};
    variables.value.forEach(v => {
      map[v.key] = v.value;
    });
    return map;
  });

  async function fetchEnvironments(workspaceId: string, projectId: string) {
    if (!workspaceId || !projectId) return;

    loading.value = true;
    try {
      const response = await $fetch<WorkspaceEnvironments>(
        `/api/admin/projects/${projectId}/environments`
      );
      environments.value = response.environments || [];

      const savedId = getSavedEnvironmentId();
      if (savedId && environments.value.find(e => e.id === savedId)) {
        activeEnvironmentId.value = savedId;
      } else if (response.activeEnvironmentId) {
        activeEnvironmentId.value = response.activeEnvironmentId;
      } else if (environments.value.length > 0) {
        const firstEnv = environments.value[0];
        if (firstEnv?.id) {
          activeEnvironmentId.value = firstEnv.id;
        }
      }

      saveEnvironmentId(activeEnvironmentId.value);
    } catch (error) {
      console.error('Failed to fetch environments:', error);
      environments.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function setActiveEnvironment(environmentId: string, projectId: string) {
    try {
      await api.put(`/api/admin/environments/${environmentId}/activate`, {
        body: { projectId }
      });

      activeEnvironmentId.value = environmentId;
      saveEnvironmentId(environmentId);

      environments.value = environments.value.map(e => ({
        ...e,
        isActive: e.id === environmentId
      }));
    } catch (error) {
      console.error('Failed to set active environment:', error);
    }
  }

  function getSavedEnvironmentId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  }

  function saveEnvironmentId(environmentId: string | null) {
    if (typeof window === 'undefined') return;
    if (environmentId) {
      localStorage.setItem(STORAGE_KEY, environmentId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function createEnvironment(projectId: string, name: string) {
    try {
      const response = await api.post<Environment>(
        `/api/admin/projects/${projectId}/environments`,
        { body: { name } }
      );
      environments.value.push(response);
      return response;
    } catch (error) {
      console.error('Failed to create environment:', error);
      throw error;
    }
  }

  async function deleteEnvironment(environmentId: string) {
    try {
      await api.delete(`/api/admin/environments/${environmentId}`);
      environments.value = environments.value.filter(e => e.id !== environmentId);

      if (activeEnvironmentId.value === environmentId) {
        activeEnvironmentId.value = environments.value[0]?.id || null;
        saveEnvironmentId(activeEnvironmentId.value);
      }
    } catch (error) {
      console.error('Failed to delete environment:', error);
      throw error;
    }
  }

  async function duplicateEnvironment(environmentId: string, name?: string) {
    try {
      const response = await api.post<Environment>(
        `/api/admin/environments/${environmentId}/duplicate`,
        { body: { name } }
      );
      environments.value.push(response);
      return response;
    } catch (error) {
      console.error('Failed to duplicate environment:', error);
      throw error;
    }
  }

  async function addVariable(environmentId: string, key: string, value: string, isSecret: boolean = false) {
    try {
      const response = await api.post<Variable>(
        `/api/admin/environments/${environmentId}/variables`,
        { body: { key, value, isSecret } }
      );

      const env = environments.value.find(e => e.id === environmentId);
      if (env) {
        if (!env.variables) env.variables = [];
        env.variables.push(response);
      }

      return response;
    } catch (error) {
      console.error('Failed to add variable:', error);
      throw error;
    }
  }

  async function updateVariable(variableId: string, key: string, value: string, isSecret: boolean) {
    try {
      const response = await api.put<Variable>(
        `/api/admin/variables/${variableId}`,
        { body: { key, value, isSecret } }
      );

      for (const env of environments.value) {
        const varIndex = env.variables?.findIndex(v => v.id === variableId);
        if (varIndex !== undefined && varIndex >= 0 && env.variables) {
          env.variables[varIndex] = response;
          break;
        }
      }

      return response;
    } catch (error) {
      console.error('Failed to update variable:', error);
      throw error;
    }
  }

  async function deleteVariable(variableId: string) {
    try {
      await api.delete(`/api/admin/variables/${variableId}`);

      for (const env of environments.value) {
        if (env.variables) {
          env.variables = env.variables.filter(v => v.id !== variableId);
        }
      }
    } catch (error) {
      console.error('Failed to delete variable:', error);
      throw error;
    }
  }

  function clearEnvironments() {
    environments.value = [];
    activeEnvironmentId.value = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    environments,
    activeEnvironment,
    activeEnvironmentId,
    variables,
    variableMap,
    loading,
    fetchEnvironments,
    setActiveEnvironment,
    createEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    addVariable,
    updateVariable,
    deleteVariable,
    clearEnvironments
  };
}
