import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, f as folders } from '../../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
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

function buildFolderTree(allFolders, parentId) {
  return allFolders.filter((folder) => folder.parentFolderId === parentId).sort((a, b) => a.order - b.order).map((folder) => ({
    ...folder,
    children: buildFolderTree(allFolders, folder.id)
  }));
}
const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Folder ID is required"
    });
  }
  try {
    const folder = db.select().from(folders).where(eq(folders.id, id)).get();
    if (!folder) {
      throw createError({
        statusCode: 404,
        statusMessage: "Folder not found"
      });
    }
    const allCollectionFolders = db.select().from(folders).where(eq(folders.collectionId, folder.collectionId)).all();
    const children = buildFolderTree(allCollectionFolders, id);
    return {
      ...folder,
      children
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching folder:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch folder"
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
