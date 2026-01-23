import { d as defineEventHandler, r as readBody, c as createError, b as db, f as folders } from '../../../../nitro/nitro.mjs';
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

function wouldCreateCircularReference(allFolders, folderId, newParentId) {
  if (newParentId === null) return false;
  if (newParentId === folderId) return true;
  let currentId = newParentId;
  while (currentId !== null) {
    if (currentId === folderId) return true;
    const parent = allFolders.find((f) => f.id === currentId);
    currentId = (parent == null ? void 0 : parent.parentFolderId) || null;
  }
  return false;
}
const reorder_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.collectionId || !body.updates || !Array.isArray(body.updates)) {
    throw createError({
      statusCode: 400,
      statusMessage: "collectionId and updates array are required"
    });
  }
  if (body.updates.length === 0) {
    return { success: true, message: "No updates to process" };
  }
  try {
    const allCollectionFolders = db.select().from(folders).where(eq(folders.collectionId, body.collectionId)).all();
    for (const update of body.updates) {
      const existing = allCollectionFolders.find((f) => f.id === update.id);
      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: `Folder ${update.id} not found`
        });
      }
      if (update.parentFolderId !== void 0 && update.parentFolderId !== null) {
        const parentExists = allCollectionFolders.find((f) => f.id === update.parentFolderId);
        if (!parentExists) {
          throw createError({
            statusCode: 404,
            statusMessage: `Parent folder ${update.parentFolderId} not found`
          });
        }
        if (parentExists.collectionId !== body.collectionId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Parent folder must belong to the same collection"
          });
        }
        if (wouldCreateCircularReference(allCollectionFolders, update.id, update.parentFolderId)) {
          throw createError({
            statusCode: 400,
            statusMessage: "Cannot move folder: would create a circular reference"
          });
        }
      }
    }
    const updatedFolders = [];
    for (const update of body.updates) {
      const existing = allCollectionFolders.find((f) => f.id === update.id);
      if (!existing) continue;
      const updateData = {};
      if (update.parentFolderId !== void 0) {
        updateData.parentFolderId = update.parentFolderId;
      }
      if (update.order !== void 0) {
        updateData.order = update.order;
      }
      if (Object.keys(updateData).length > 0) {
        const updated = db.update(folders).set(updateData).where(eq(folders.id, update.id)).returning().get();
        updatedFolders.push(updated);
      }
    }
    return {
      success: true,
      message: `Updated ${updatedFolders.length} folders`,
      folders: updatedFolders
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error reordering folders:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to reorder folders"
    });
  }
});

export { reorder_post as default };
//# sourceMappingURL=reorder.post.mjs.map
