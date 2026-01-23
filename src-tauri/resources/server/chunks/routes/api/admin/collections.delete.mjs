import { d as defineEventHandler, a as getQuery, c as createError, u as useStorage, b as db, f as folders, e as savedRequests } from '../../../nitro/nitro.mjs';
import { eq, inArray } from 'drizzle-orm';
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

const collections_delete = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const id = query.id;
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Collection ID is required"
    });
  }
  const storage = useStorage("collections");
  const existing = await storage.getItem(id);
  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: "Collection not found"
    });
  }
  if (existing.name === "root" || id === "root") {
    throw createError({
      statusCode: 403,
      statusMessage: "Cannot delete the root collection"
    });
  }
  const mocksStorage = useStorage("mocks");
  const mockKeys = await mocksStorage.getKeys();
  for (const key of mockKeys) {
    const mock = await mocksStorage.getItem(key);
    if (mock && mock.collection === id) {
      mock.collection = "root";
      mock.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await mocksStorage.setItem(key, mock);
    }
  }
  const collectionFolders = db.select().from(folders).where(eq(folders.collectionId, id)).all();
  if (collectionFolders.length > 0) {
    const folderIds = collectionFolders.map((f) => f.id);
    await db.delete(savedRequests).where(inArray(savedRequests.folderId, folderIds)).run();
    await db.delete(folders).where(eq(folders.collectionId, id)).run();
  }
  await storage.removeItem(id);
  return { success: true, message: `Collection deleted. ${mockKeys.length > 0 ? "Associated mocks moved to root collection." : ""}${collectionFolders.length > 0 ? ` ${collectionFolders.length} folder(s) and their requests deleted.` : ""}` };
});

export { collections_delete as default };
//# sourceMappingURL=collections.delete.mjs.map
