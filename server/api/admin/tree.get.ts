import { db } from '../../db';
import { workspaces, projects, collections, folders, savedRequests } from '../../db/schema';
import { eq, desc, asc, inArray } from 'drizzle-orm';
import { getAccessibleWorkspaceIds, getWorkspacePermissionsBatch } from '../../utils/permissions';

interface RequestItem {
  id: string;
  folderId: string | null;
  collectionId: string | null;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | string | null;
  auth: {
    type: string;
    credentials?: Record<string, string>;
  } | null;
  mockConfig: {
    isEnabled: boolean;
    statusCode: number;
    delay: number;
    responseBody: Record<string, unknown> | string | null;
    responseHeaders: Record<string, string>;
  } | null;
  preScript: string | null;
  postScript: string | null;
  pathVariables: Record<string, { value: string; description?: string }> | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FolderWithRequestsAndChildren {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  requests: RequestItem[];
  children: FolderWithRequestsAndChildren[];
}

interface CollectionWithFolders {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  authConfig: Record<string, unknown> | null;
  createdAt: Date;
  folders: FolderWithRequestsAndChildren[];
  requests: RequestItem[];
  folderCount: number;
  requestCount: number;
}

interface ProjectWithCollections {
  id: string;
  workspaceId: string;
  name: string;
  baseUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  collections: CollectionWithFolders[];
  collectionCount: number;
}

interface WorkspaceWithProjects {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  projects: ProjectWithCollections[];
  projectCount: number;
  isOwner: boolean;
  isShared: boolean;
  permission: 'owner' | 'edit' | 'view' | null;
}

function parseJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

function buildFolderTree(
  allFolders: typeof folders.$inferSelect[],
  allRequests: RequestItem[],
  parentId: string | null = null
): FolderWithRequestsAndChildren[] {
  return allFolders
    .filter(folder => folder.parentFolderId === parentId)
    .sort((a, b) => a.order - b.order)
    .map(folder => ({
      ...folder,
      requests: allRequests.filter(req => req.folderId === folder.id),
      children: buildFolderTree(allFolders, allRequests, folder.id)
    }));
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const user = event.context.user;

  if (method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    });
  }

  // If no user, return empty
  if (!user?.id) {
    return [];
  }

  try {
    // Get all workspace IDs this user can access
    const accessibleIds = await getAccessibleWorkspaceIds(user.id, user.email);
    
    console.log('[Tree API] User ID:', user.id);
    console.log('[Tree API] Accessible workspace IDs:', accessibleIds);

    if (accessibleIds.length === 0) {
      console.log('[Tree API] No accessible workspaces found');
      return [];
    }

    // Fetch only accessible workspaces
    const allWorkspaces = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, accessibleIds))
      .orderBy(desc(workspaces.createdAt));

    const allProjects = await db
      .select()
      .from(projects);

    const allCollections = await db
      .select()
      .from(collections);

    const allFolders = await db
      .select()
      .from(folders);

    const allRequestsRaw = await db
      .select()
      .from(savedRequests)
      .orderBy(asc(savedRequests.order));

    // Parse JSON fields from text columns
    const allRequests: RequestItem[] = allRequestsRaw.map(req => {
      const parsedHeaders = parseJsonField<Record<string, string>>(req.headers);
      return {
        ...req,
        headers: parsedHeaders,
        body: parseJsonField<Record<string, unknown> | string>(req.body),
        auth: parseJsonField<RequestItem['auth']>(req.auth),
        mockConfig: parseJsonField<RequestItem['mockConfig']>(req.mockConfig),
        pathVariables: parseJsonField<RequestItem['pathVariables']>(req.pathVariables)
      };
    });

    // Build workspace tree with permission info (using batch query to avoid N+1)
    const workspaceIds = allWorkspaces.map(w => w.id);
    const permissionMap = await getWorkspacePermissionsBatch(user.id, workspaceIds);

    const workspacesWithProjects: WorkspaceWithProjects[] = allWorkspaces.map((workspace) => {
      const workspaceProjects = allProjects.filter(p => p.workspaceId === workspace.id);
      // For legacy workspaces (ownerId is null, 'unknown', or empty), treat current user as owner
      const isOwner = workspace.ownerId === user.id || workspace.ownerId === null || workspace.ownerId === 'unknown' || workspace.ownerId === '';
      const permission = isOwner ? 'owner' : (permissionMap.get(workspace.id) || null);

      return {
        ...workspace,
        projects: workspaceProjects.map(project => {
          const projectCollections = allCollections.filter(c => c.projectId === project.id);

          return {
            ...project,
            collections: projectCollections.map(collection => {
              const collectionFolders = allFolders.filter(f => f.collectionId === collection.id);
              const folderTree = buildFolderTree(collectionFolders, allRequests);

              // Get collection-level requests (root level, where folderId is null)
              const collectionRootRequests = allRequests.filter(req => 
                req.collectionId === collection.id && req.folderId === null
              );

              const folderCount = collectionFolders.length;
              
              // Count all requests in collection (both folder-level and collection-level)
              const requestCount = allRequests.filter(req => {
                if (req.collectionId === collection.id) return true;
                const folder = allFolders.find(f => f.id === req.folderId);
                return folder?.collectionId === collection.id;
              }).length;

              return {
                ...collection,
                folders: folderTree,
                requests: collectionRootRequests,
                folderCount,
                requestCount
              };
            }),
            collectionCount: projectCollections.length
          };
        }),
        projectCount: workspaceProjects.length,
        isOwner,
        isShared: !isOwner,
        permission
      };
    });

    return workspacesWithProjects;
  } catch (error) {
    console.error('Error fetching workspace tree:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch workspace tree'
    });
  }
});