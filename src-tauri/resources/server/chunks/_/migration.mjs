import { u as useStorage, b as db, i as collections, f as folders, e as savedRequests, p as projects, w as workspaces } from '../nitro/nitro.mjs';
import { eq, desc } from 'drizzle-orm';

const PERSONAL_WORKSPACE_ID = "personal";
const PERSONAL_WORKSPACE_NAME = "Personal";
const DEFAULT_PROJECT_ID = "default";
const DEFAULT_PROJECT_NAME = "My Project";
async function createDefaultWorkspaceAndProject() {
  let workspaceId = PERSONAL_WORKSPACE_ID;
  let projectId = DEFAULT_PROJECT_ID;
  const existingWorkspace = await db.select().from(workspaces).where(eq(workspaces.id, PERSONAL_WORKSPACE_ID)).get();
  if (!existingWorkspace) {
    await db.insert(workspaces).values({
      id: PERSONAL_WORKSPACE_ID,
      name: PERSONAL_WORKSPACE_NAME
    });
    console.log('\u2705 Created default "Personal" workspace');
  }
  const existingProject = await db.select().from(projects).where(eq(projects.id, DEFAULT_PROJECT_ID)).get();
  if (!existingProject) {
    await db.insert(projects).values({
      id: DEFAULT_PROJECT_ID,
      workspaceId: PERSONAL_WORKSPACE_ID,
      name: DEFAULT_PROJECT_NAME
    });
    console.log('\u2705 Created default "My Project" project');
  }
  return { workspaceId, projectId };
}
async function migrateMocksToNewSchema() {
  var _a, _b;
  const result = {
    success: false,
    collectionsCreated: 0,
    foldersCreated: 0,
    requestsMigrated: 0,
    errors: []
  };
  try {
    const { workspaceId, projectId } = await createDefaultWorkspaceAndProject();
    result.workspaceId = workspaceId;
    result.projectId = projectId;
    const mocksStorage = useStorage("mocks");
    const collectionsStorage = useStorage("collections");
    const mockKeys = await mocksStorage.getKeys();
    const oldMocks = [];
    for (const key of mockKeys) {
      const mock = await mocksStorage.getItem(key);
      if (mock) {
        oldMocks.push(mock);
      }
    }
    const collectionKeys = await collectionsStorage.getKeys();
    const oldCollections = [];
    for (const key of collectionKeys) {
      const collection = await collectionsStorage.getItem(key);
      if (collection) {
        oldCollections.push(collection);
      }
    }
    const collectionMappings = {};
    const folderMappings = {};
    for (const oldCollection of oldCollections) {
      if (oldCollection.name === "root") continue;
      try {
        const newCollectionId = `migrated_${oldCollection.id}`;
        collectionMappings[oldCollection.id] = newCollectionId;
        await db.insert(collections).values({
          id: newCollectionId,
          projectId,
          name: oldCollection.name,
          description: oldCollection.description || `Migrated from collection: ${oldCollection.name}`
        });
        result.collectionsCreated++;
        const rootFolderId = `root_${newCollectionId}`;
        await db.insert(folders).values({
          id: rootFolderId,
          collectionId: newCollectionId,
          parentFolderId: void 0,
          name: "Root",
          order: 0
        });
        result.foldersCreated++;
        folderMappings[`${newCollectionId}_root`] = rootFolderId;
      } catch (err) {
        if (!((_a = err.message) == null ? void 0 : _a.includes("UNIQUE constraint failed"))) {
          result.errors.push(`Failed to migrate collection "${oldCollection.name}": ${err.message}`);
        }
      }
    }
    for (const mock of oldMocks) {
      try {
        const collectionId = mock.collection || "root";
        let folderId;
        if (collectionId === "root") {
          const rootFolderInProject = await db.select().from(folders).innerJoin(collections, eq(folders.collectionId, collections.id)).where(eq(collections.projectId, projectId)).orderBy(desc(folders.order)).limit(1).get();
          if (rootFolderInProject) {
            folderId = rootFolderInProject.folders.id;
          } else {
            const newRootCollectionId = `root_${projectId}`;
            await db.insert(collections).values({
              id: newRootCollectionId,
              projectId,
              name: "Root Collection",
              description: "Default collection for migrated mocks"
            });
            result.collectionsCreated++;
            folderId = `root_${newRootCollectionId}`;
            await db.insert(folders).values({
              id: folderId,
              collectionId: newRootCollectionId,
              parentFolderId: void 0,
              name: "Root",
              order: 0
            });
            result.foldersCreated++;
          }
        } else {
          folderId = folderMappings[`${collectionId}_root`];
        }
        if (!folderId) {
          result.errors.push(`Could not find folder for mock: ${mock.method} ${mock.path}`);
          continue;
        }
        const requestName = `${mock.method} ${mock.path}`;
        const headers = {
          "Content-Type": "application/json"
        };
        const body = {
          mockResponse: mock.response,
          mockStatus: mock.status,
          mockDelay: mock.delay,
          mockSecure: mock.secure || false,
          originalMockId: mock.id,
          migratedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await db.insert(savedRequests).values({
          folderId,
          name: requestName,
          method: mock.method.toUpperCase(),
          url: mock.path,
          headers,
          body,
          auth: null,
          order: 0
        });
        result.requestsMigrated++;
      } catch (err) {
        if (!((_b = err.message) == null ? void 0 : _b.includes("UNIQUE constraint failed"))) {
          result.errors.push(`Failed to migrate mock "${mock.method} ${mock.path}": ${err.message}`);
        }
      }
    }
    const rollbackData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      workspaceId,
      projectId,
      collectionMappings,
      folderMappings,
      mockCount: oldMocks.length
    };
    result.rollbackData = rollbackData;
    await useStorage("settings").setItem("migration_rollback", rollbackData);
    await useStorage("settings").setItem("migration_completed", {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      workspaceId,
      projectId,
      collectionsCreated: result.collectionsCreated,
      foldersCreated: result.foldersCreated,
      requestsMigrated: result.requestsMigrated
    });
    result.success = result.errors.length === 0;
    console.log(`\u2705 Migration completed: ${result.requestsMigrated} requests migrated`);
  } catch (err) {
    result.errors.push(`Migration failed: ${err.message}`);
    console.error("\u274C Migration error:", err);
  }
  return result;
}
async function rollbackMigration() {
  try {
    const rollbackData = await useStorage("settings").getItem("migration_rollback");
    if (!rollbackData) {
      return { success: false, message: "No migration rollback data found" };
    }
    const { workspaceId, projectId, collectionMappings, folderMappings } = rollbackData;
    const savedRequests$1 = await db.select().from(savedRequests).innerJoin(folders, eq(savedRequests.folderId, folders.id)).innerJoin(collections, eq(folders.collectionId, collections.id)).where(eq(collections.projectId, projectId));
    for (const sr of savedRequests$1) {
      const body = sr.savedRequests.body;
      if (body == null ? void 0 : body.originalMockId) {
        await useStorage("mocks").setItem(body.originalMockId, {
          id: body.originalMockId,
          collection: "root",
          path: sr.savedRequests.url,
          method: sr.savedRequests.method,
          status: body.mockStatus || 200,
          response: body.mockResponse || {},
          delay: body.mockDelay || 0,
          secure: body.mockSecure || false,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    await db.delete(savedRequests).where(eq(savedRequests.id, ""));
    await db.delete(folders).where(eq(folders.id, ""));
    await db.delete(collections).where(eq(collections.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await useStorage("settings").removeItem("migration_rollback");
    await useStorage("settings").removeItem("migration_completed");
    return { success: true, message: `Rollback completed. ${savedRequests$1.length} mocks restored.` };
  } catch (err) {
    console.error("\u274C Rollback error:", err);
    return { success: false, message: `Rollback failed: ${err.message}` };
  }
}
async function getMigrationStatus() {
  const mocksStorage = useStorage("mocks");
  const collectionsStorage = useStorage("collections");
  const mockKeys = await mocksStorage.getKeys();
  const collectionKeys = await collectionsStorage.getKeys();
  const migrationData = await useStorage("settings").getItem("migration_completed");
  return {
    isMigrated: !!migrationData,
    migrationData: migrationData || void 0,
    mockCount: mockKeys.length,
    collectionCount: collectionKeys.length
  };
}

export { getMigrationStatus as g, migrateMocksToNewSchema as m, rollbackMigration as r };
//# sourceMappingURL=migration.mjs.map
