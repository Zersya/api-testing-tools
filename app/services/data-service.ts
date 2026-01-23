/**
 * Desktop Data Service
 * Provides CRUD operations for local data with sync queue
 */

import {
  getLocalData,
  updateLocalData,
  addToSyncQueue,
  isDesktop,
  type LocalWorkspace,
  type LocalProject,
  type LocalCollection,
  type LocalFolder,
  type LocalRequest,
  type LocalEnvironment,
} from './local-store';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ============ WORKSPACES ============

export async function getWorkspaces(): Promise<LocalWorkspace[]> {
  const data = await getLocalData();
  return data.workspaces || [];
}

export async function getWorkspaceById(id: string): Promise<LocalWorkspace | null> {
  const workspaces = await getWorkspaces();
  return workspaces.find(w => w.id === id) || null;
}

export async function createWorkspace(name: string, description?: string): Promise<LocalWorkspace> {
  const workspace: LocalWorkspace = {
    id: generateId(),
    name,
    description,
    createdAt: now(),
    updatedAt: now(),
    isDirty: true,
    projects: [],
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: [...data.workspaces, workspace],
  }));

  await addToSyncQueue({
    entityType: 'workspace',
    entityId: workspace.id,
    action: 'create',
    payload: workspace,
  });

  return workspace;
}

export async function updateWorkspace(id: string, updates: Partial<LocalWorkspace>): Promise<LocalWorkspace | null> {
  let updated: LocalWorkspace | null = null;

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => {
      if (w.id === id) {
        updated = { ...w, ...updates, updatedAt: now(), isDirty: true };
        return updated;
      }
      return w;
    }),
  }));

  if (updated) {
    await addToSyncQueue({
      entityType: 'workspace',
      entityId: id,
      action: 'update',
      payload: updated,
    });
  }

  return updated;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.filter(w => w.id !== id),
  }));

  await addToSyncQueue({
    entityType: 'workspace',
    entityId: id,
    action: 'delete',
    payload: { id },
  });

  return true;
}

// ============ PROJECTS ============

export async function createProject(workspaceId: string, name: string): Promise<LocalProject> {
  const project: LocalProject = {
    id: generateId(),
    workspaceId,
    name,
    createdAt: now(),
    updatedAt: now(),
    isDirty: true,
    collections: [],
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => {
      if (w.id === workspaceId) {
        return { ...w, projects: [...w.projects, project], updatedAt: now() };
      }
      return w;
    }),
  }));

  await addToSyncQueue({
    entityType: 'project',
    entityId: project.id,
    action: 'create',
    payload: project,
  });

  return project;
}

export async function updateProject(id: string, updates: Partial<LocalProject>): Promise<LocalProject | null> {
  let updated: LocalProject | null = null;

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.map(p => {
        if (p.id === id) {
          updated = { ...p, ...updates, updatedAt: now(), isDirty: true };
          return updated;
        }
        return p;
      }),
    })),
  }));

  if (updated) {
    await addToSyncQueue({
      entityType: 'project',
      entityId: id,
      action: 'update',
      payload: updated,
    });
  }

  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.filter(p => p.id !== id),
    })),
  }));

  await addToSyncQueue({
    entityType: 'project',
    entityId: id,
    action: 'delete',
    payload: { id },
  });

  return true;
}

// ============ COLLECTIONS ============

export async function createCollection(projectId: string, name: string, description?: string, color?: string): Promise<LocalCollection> {
  const collection: LocalCollection = {
    id: generateId(),
    projectId,
    name,
    description,
    color: color || '#6366f1',
    createdAt: now(),
    updatedAt: now(),
    isDirty: true,
    folders: [],
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.map(p => {
        if (p.id === projectId) {
          return { ...p, collections: [...p.collections, collection], updatedAt: now() };
        }
        return p;
      }),
    })),
  }));

  await addToSyncQueue({
    entityType: 'collection',
    entityId: collection.id,
    action: 'create',
    payload: collection,
  });

  return collection;
}

// ============ FOLDERS ============

export async function createFolder(collectionId: string, name: string, parentFolderId?: string): Promise<LocalFolder> {
  const folder: LocalFolder = {
    id: generateId(),
    collectionId,
    parentFolderId,
    name,
    order: 0,
    createdAt: now(),
    updatedAt: now(),
    isDirty: true,
    requests: [],
    children: [],
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.map(p => ({
        ...p,
        collections: p.collections.map(c => {
          if (c.id === collectionId) {
            if (parentFolderId) {
              // Add to parent folder's children
              const addToParent = (folders: LocalFolder[]): LocalFolder[] => {
                return folders.map(f => {
                  if (f.id === parentFolderId) {
                    return { ...f, children: [...f.children, folder] };
                  }
                  return { ...f, children: addToParent(f.children) };
                });
              };
              return { ...c, folders: addToParent(c.folders) };
            } else {
              return { ...c, folders: [...c.folders, folder] };
            }
          }
          return c;
        }),
      })),
    })),
  }));

  await addToSyncQueue({
    entityType: 'folder',
    entityId: folder.id,
    action: 'create',
    payload: folder,
  });

  return folder;
}

// ============ REQUESTS ============

export async function createRequest(folderId: string, request: Partial<LocalRequest>): Promise<LocalRequest> {
  const newRequest: LocalRequest = {
    id: generateId(),
    folderId,
    name: request.name || 'New Request',
    method: request.method || 'GET',
    url: request.url || '',
    headers: request.headers || null,
    body: request.body || null,
    auth: request.auth || null,
    order: request.order || 0,
    createdAt: now(),
    updatedAt: now(),
    isDirty: true,
  };

  const addRequestToFolder = (folders: LocalFolder[]): LocalFolder[] => {
    return folders.map(f => {
      if (f.id === folderId) {
        return { ...f, requests: [...f.requests, newRequest] };
      }
      return { ...f, children: addRequestToFolder(f.children) };
    });
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.map(p => ({
        ...p,
        collections: p.collections.map(c => ({
          ...c,
          folders: addRequestToFolder(c.folders),
        })),
      })),
    })),
  }));

  await addToSyncQueue({
    entityType: 'request',
    entityId: newRequest.id,
    action: 'create',
    payload: newRequest,
  });

  return newRequest;
}

export async function updateRequest(id: string, updates: Partial<LocalRequest>): Promise<LocalRequest | null> {
  let updated: LocalRequest | null = null;

  const updateInFolders = (folders: LocalFolder[]): LocalFolder[] => {
    return folders.map(f => ({
      ...f,
      requests: f.requests.map(r => {
        if (r.id === id) {
          updated = { ...r, ...updates, updatedAt: now(), isDirty: true };
          return updated;
        }
        return r;
      }),
      children: updateInFolders(f.children),
    }));
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.map(p => ({
        ...p,
        collections: p.collections.map(c => ({
          ...c,
          folders: updateInFolders(c.folders),
        })),
      })),
    })),
  }));

  if (updated) {
    await addToSyncQueue({
      entityType: 'request',
      entityId: id,
      action: 'update',
      payload: updated,
    });
  }

  return updated;
}

export async function deleteRequest(id: string): Promise<boolean> {
  const deleteFromFolders = (folders: LocalFolder[]): LocalFolder[] => {
    return folders.map(f => ({
      ...f,
      requests: f.requests.filter(r => r.id !== id),
      children: deleteFromFolders(f.children),
    }));
  };

  await updateLocalData(data => ({
    ...data,
    workspaces: data.workspaces.map(w => ({
      ...w,
      projects: w.projects.map(p => ({
        ...p,
        collections: p.collections.map(c => ({
          ...c,
          folders: deleteFromFolders(c.folders),
        })),
      })),
    })),
  }));

  await addToSyncQueue({
    entityType: 'request',
    entityId: id,
    action: 'delete',
    payload: { id },
  });

  return true;
}

// ============ ENVIRONMENTS ============

export async function getEnvironments(projectId?: string): Promise<LocalEnvironment[]> {
  const data = await getLocalData();
  if (projectId) {
    return data.environments.filter(e => e.projectId === projectId);
  }
  return data.environments;
}

export async function createEnvironment(projectId: string, name: string): Promise<LocalEnvironment> {
  const env: LocalEnvironment = {
    id: generateId(),
    projectId,
    name,
    variables: [],
    isActive: false,
    createdAt: now(),
    updatedAt: now(),
    isDirty: true,
  };

  await updateLocalData(data => ({
    ...data,
    environments: [...data.environments, env],
  }));

  await addToSyncQueue({
    entityType: 'environment',
    entityId: env.id,
    action: 'create',
    payload: env,
  });

  return env;
}

export async function updateEnvironment(id: string, updates: Partial<LocalEnvironment>): Promise<LocalEnvironment | null> {
  let updated: LocalEnvironment | null = null;

  await updateLocalData(data => ({
    ...data,
    environments: data.environments.map(e => {
      if (e.id === id) {
        updated = { ...e, ...updates, updatedAt: now(), isDirty: true };
        return updated;
      }
      return e;
    }),
  }));

  if (updated) {
    await addToSyncQueue({
      entityType: 'environment',
      entityId: id,
      action: 'update',
      payload: updated,
    });
  }

  return updated;
}

// ============ TREE VIEW ============

export async function getWorkspaceTree(): Promise<LocalWorkspace[]> {
  return getWorkspaces();
}

// Export for use in components
export { isDesktop };
