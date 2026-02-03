import { db } from '../../db';
import { workspaces, projects, collections, folders, savedRequests } from '../../db/schema';
import { eq, desc, asc } from 'drizzle-orm';

interface RequestItem {
  id: string;
  folderId: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | string | null;
  auth: {
    type: string;
    credentials?: Record<string, string>;
  } | null;
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

  if (method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method not allowed'
    });
  }

  try {
    const allWorkspaces = await db
      .select()
      .from(workspaces)
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

    const allRequests = await db
      .select()
      .from(savedRequests)
      .orderBy(asc(savedRequests.order)) as RequestItem[];

    const workspacesWithProjects: WorkspaceWithProjects[] = allWorkspaces.map(workspace => {
      const workspaceProjects = allProjects.filter(p => p.workspaceId === workspace.id);

      return {
        ...workspace,
        projects: workspaceProjects.map(project => {
          const projectCollections = allCollections.filter(c => c.projectId === project.id);

          return {
            ...project,
            collections: projectCollections.map(collection => {
              const collectionFolders = allFolders.filter(f => f.collectionId === collection.id);
              const folderTree = buildFolderTree(collectionFolders, allRequests);

              const folderCount = collectionFolders.length;
              const requestCount = allRequests.filter(req => {
                const folder = allFolders.find(f => f.id === req.folderId);
                return folder?.collectionId === collection.id;
              }).length;

              return {
                ...collection,
                folders: folderTree,
                folderCount,
                requestCount
              };
            }),
            collectionCount: projectCollections.length
          };
        }),
        projectCount: workspaceProjects.length
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