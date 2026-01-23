import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, p as projects, i as collections, f as folders } from '../../../../../nitro/nitro.mjs';
import { eq, desc } from 'drizzle-orm';
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

function buildFolderTree(allFolders, parentId = null) {
  return allFolders.filter((folder) => folder.parentFolderId === parentId).sort((a, b) => a.order - b.order).map((folder) => ({
    ...folder,
    children: buildFolderTree(allFolders, folder.id)
  }));
}
const collections_get = defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, "id");
  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Project ID is required"
    });
  }
  try {
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: "Project not found"
      });
    }
    const projectCollections = db.select().from(collections).where(eq(collections.projectId, projectId)).orderBy(desc(collections.createdAt)).all();
    const collectionsWithFolders = projectCollections.map((collection) => {
      const collectionFolders = db.select().from(folders).where(eq(folders.collectionId, collection.id)).all();
      const folderTree = buildFolderTree(collectionFolders);
      return {
        ...collection,
        folders: folderTree
      };
    });
    return collectionsWithFolders;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching collections:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch collections"
    });
  }
});

export { collections_get as default };
//# sourceMappingURL=collections.get.mjs.map
