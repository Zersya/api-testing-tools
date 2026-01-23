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

function countDescendants(allFolders, parentId) {
  const children = allFolders.filter((f) => f.parentFolderId === parentId);
  let count = children.length;
  for (const child of children) {
    count += countDescendants(allFolders, child.id);
  }
  return count;
}
const _id__delete = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Folder ID is required"
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
    const descendantCount = countDescendants(allCollectionFolders, id);
    db.delete(folders).where(eq(folders.id, id)).run();
    return {
      success: true,
      message: `Folder "${existing.name}" deleted successfully`,
      deletedChildFolders: descendantCount
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error deleting folder:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete folder"
    });
  }
});

export { _id__delete as default };
//# sourceMappingURL=_id_.delete.mjs.map
