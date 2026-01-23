import { d as defineEventHandler, h as getRouterParam, c as createError, r as readBody, b as db, f as folders } from '../../../../nitro/nitro.mjs';
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
const _id__put = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Folder ID is required"
    });
  }
  const body = await readBody(event);
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "At least one field must be provided for update"
    });
  }
  try {
    const existing = db.select().from(folders).where(eq(folders.id, id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Folder not found"
      });
    }
    const allCollectionFolders = db.select().from(folders).where(eq(folders.collectionId, existing.collectionId)).all();
    const updateData = {};
    let targetParentId = existing.parentFolderId;
    if (body.name !== void 0) {
      if (typeof body.name !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Folder name must be a string"
        });
      }
      const trimmedName = body.name.trim();
      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: "Folder name cannot be empty"
        });
      }
      if (trimmedName.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: "Folder name cannot exceed 100 characters"
        });
      }
      updateData.name = trimmedName;
    }
    if (body.parentFolderId !== void 0) {
      if (body.parentFolderId !== null && typeof body.parentFolderId !== "string") {
        throw createError({
          statusCode: 400,
          statusMessage: "Parent folder ID must be a string or null"
        });
      }
      const newParentId = body.parentFolderId;
      if (newParentId === id) {
        throw createError({
          statusCode: 400,
          statusMessage: "A folder cannot be its own parent"
        });
      }
      if (newParentId !== null) {
        const newParent = db.select().from(folders).where(eq(folders.id, newParentId)).get();
        if (!newParent) {
          throw createError({
            statusCode: 404,
            statusMessage: "New parent folder not found"
          });
        }
        if (newParent.collectionId !== existing.collectionId) {
          throw createError({
            statusCode: 400,
            statusMessage: "Parent folder must belong to the same collection"
          });
        }
        if (wouldCreateCircularReference(allCollectionFolders, id, newParentId)) {
          throw createError({
            statusCode: 400,
            statusMessage: "Cannot move folder: would create a circular reference"
          });
        }
      }
      updateData.parentFolderId = newParentId;
      targetParentId = newParentId;
    }
    if (body.order !== void 0) {
      if (typeof body.order !== "number" || !Number.isInteger(body.order)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Order must be an integer"
        });
      }
      updateData.order = body.order;
    }
    if (updateData.name !== void 0 || updateData.parentFolderId !== void 0) {
      const nameToCheck = updateData.name || existing.name;
      const siblingFolders = allCollectionFolders.filter((f) => {
        if (f.id === id) return false;
        return f.parentFolderId === targetParentId;
      });
      const duplicate = siblingFolders.find(
        (f) => f.name.toLowerCase() === nameToCheck.toLowerCase()
      );
      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Folder "${nameToCheck}" already exists at the target level`
        });
      }
    }
    const updatedFolder = db.update(folders).set(updateData).where(eq(folders.id, id)).returning().get();
    return updatedFolder;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating folder:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update folder"
    });
  }
});

export { _id__put as default };
//# sourceMappingURL=_id_.put.mjs.map
