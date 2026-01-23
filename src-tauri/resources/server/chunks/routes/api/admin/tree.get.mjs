import { d as defineEventHandler, l as getMethod, c as createError, b as db, w as workspaces, p as projects, i as collections, f as folders, e as savedRequests } from '../../../nitro/nitro.mjs';
import { desc, asc } from 'drizzle-orm';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'drizzle-orm/better-sqlite3';
import 'better-sqlite3';
import 'drizzle-orm/sqlite-core';
import 'node:url';
import 'jsonwebtoken';

function buildFolderTree(allFolders, allRequests, parentId = null) {
  return allFolders.filter((folder) => folder.parentFolderId === parentId).sort((a, b) => a.order - b.order).map((folder) => ({
    ...folder,
    requests: allRequests.filter((req) => req.folderId === folder.id),
    children: buildFolderTree(allFolders, allRequests, folder.id)
  }));
}
const tree_get = defineEventHandler(async (event) => {
  const method = getMethod(event);
  if (method !== "GET") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed"
    });
  }
  try {
    const allWorkspaces = db.select().from(workspaces).orderBy(desc(workspaces.createdAt)).all();
    const allProjects = db.select().from(projects).all();
    const allCollections = db.select().from(collections).all();
    const allFolders = db.select().from(folders).all();
    const allRequests = db.select().from(savedRequests).orderBy(asc(savedRequests.order)).all();
    const workspacesWithProjects = allWorkspaces.map((workspace) => {
      const workspaceProjects = allProjects.filter((p) => p.workspaceId === workspace.id);
      return {
        ...workspace,
        projects: workspaceProjects.map((project) => {
          const projectCollections = allCollections.filter((c) => c.projectId === project.id);
          return {
            ...project,
            collections: projectCollections.map((collection) => {
              const collectionFolders = allFolders.filter((f) => f.collectionId === collection.id);
              const folderTree = buildFolderTree(collectionFolders, allRequests);
              const folderCount = collectionFolders.length;
              const requestCount = allRequests.filter((req) => {
                const folder = allFolders.find((f) => f.id === req.folderId);
                return (folder == null ? void 0 : folder.collectionId) === collection.id;
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
    console.error("Error fetching workspace tree:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch workspace tree"
    });
  }
});

export { tree_get as default };
//# sourceMappingURL=tree.get.mjs.map
