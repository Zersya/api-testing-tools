import { db, schema } from '../db';
import { eq, desc } from 'drizzle-orm';

const PERSONAL_WORKSPACE_ID = 'personal';
const PERSONAL_WORKSPACE_NAME = 'Personal';
const DEFAULT_PROJECT_ID = 'default';
const DEFAULT_PROJECT_NAME = 'My Project';

interface OldMock {
  id: string;
  collection: string;
  path: string;
  method: string;
  status: number;
  response: any;
  delay: number;
  secure?: boolean;
  createdAt: string;
}

interface OldCollection {
  id: string;
  name: string;
  description?: string;
  color: string;
  order: number;
  createdAt: string;
  updatedAt?: string;
}

interface MigrationResult {
  success: boolean;
  workspaceId?: string;
  projectId?: string;
  collectionsCreated: number;
  foldersCreated: number;
  requestsMigrated: number;
  errors: string[];
  rollbackData?: RollbackData;
}

interface RollbackData {
  timestamp: string;
  workspaceId: string;
  projectId: string;
  collectionMappings: Record<string, string>;
  folderMappings: Record<string, string>;
  mockCount: number;
}

export async function createDefaultWorkspaceAndProject(): Promise<{ workspaceId: string; projectId: string }> {
  let workspaceId = PERSONAL_WORKSPACE_ID;
  let projectId = DEFAULT_PROJECT_ID;

  const existingWorkspace = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, PERSONAL_WORKSPACE_ID))
    .get();

  if (!existingWorkspace) {
    await db.insert(schema.workspaces).values({
      id: PERSONAL_WORKSPACE_ID,
      name: PERSONAL_WORKSPACE_NAME
    });
    console.log('✅ Created default "Personal" workspace');
  }

  const existingProject = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, DEFAULT_PROJECT_ID))
    .get();

  if (!existingProject) {
    await db.insert(schema.projects).values({
      id: DEFAULT_PROJECT_ID,
      workspaceId: PERSONAL_WORKSPACE_ID,
      name: DEFAULT_PROJECT_NAME
    });
    console.log('✅ Created default "My Project" project');
  }

  return { workspaceId, projectId };
}

export async function migrateMocksToNewSchema(): Promise<MigrationResult> {
  const result: MigrationResult = {
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

    const mocksStorage = useStorage('mocks');
    const collectionsStorage = useStorage('collections');

    const mockKeys = await mocksStorage.getKeys();
    const oldMocks: OldMock[] = [];
    for (const key of mockKeys) {
      const mock = await mocksStorage.getItem(key) as OldMock | null;
      if (mock) {
        oldMocks.push(mock);
      }
    }

    const collectionKeys = await collectionsStorage.getKeys();
    const oldCollections: OldCollection[] = [];
    for (const key of collectionKeys) {
      const collection = await collectionsStorage.getItem(key) as OldCollection | null;
      if (collection) {
        oldCollections.push(collection);
      }
    }

    const collectionMappings: Record<string, string> = {};
    const folderMappings: Record<string, string> = {};

    for (const oldCollection of oldCollections) {
      if (oldCollection.name === 'root') continue;

      try {
        const newCollectionId = `migrated_${oldCollection.id}`;
        collectionMappings[oldCollection.id] = newCollectionId;

        await db.insert(schema.collections).values({
          id: newCollectionId,
          projectId: projectId,
          name: oldCollection.name,
          description: oldCollection.description || `Migrated from collection: ${oldCollection.name}`
        });
        result.collectionsCreated++;

        const rootFolderId = `root_${newCollectionId}`;
        await db.insert(schema.folders).values({
          id: rootFolderId,
          collectionId: newCollectionId,
          parentFolderId: undefined,
          name: 'Root',
          order: 0
        });
        result.foldersCreated++;
        folderMappings[`${newCollectionId}_root`] = rootFolderId;

      } catch (err: any) {
        if (!err.message?.includes('UNIQUE constraint failed')) {
          result.errors.push(`Failed to migrate collection "${oldCollection.name}": ${err.message}`);
        }
      }
    }

    for (const mock of oldMocks) {
      try {
        const collectionId = mock.collection || 'root';
        let folderId: string | undefined;

        if (collectionId === 'root') {
          const rootFolderInProject = await db
            .select()
            .from(schema.folders)
            .innerJoin(schema.collections, eq(schema.folders.collectionId, schema.collections.id))
            .where(eq(schema.collections.projectId, projectId))
            .orderBy(desc(schema.folders.order))
            .limit(1)
            .get();

          if (rootFolderInProject) {
            folderId = rootFolderInProject.folders.id;
          } else {
            const newRootCollectionId = `root_${projectId}`;
            await db.insert(schema.collections).values({
              id: newRootCollectionId,
              projectId: projectId,
              name: 'Root Collection',
              description: 'Default collection for migrated mocks'
            });
            result.collectionsCreated++;

            folderId = `root_${newRootCollectionId}`;
            await db.insert(schema.folders).values({
              id: folderId,
              collectionId: newRootCollectionId,
              parentFolderId: undefined,
              name: 'Root',
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
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        const body: Record<string, any> = {
          mockResponse: mock.response,
          mockStatus: mock.status,
          mockDelay: mock.delay,
          mockSecure: mock.secure || false,
          originalMockId: mock.id,
          migratedAt: new Date().toISOString()
        };

        await db.insert(schema.savedRequests).values({
          folderId: folderId,
          name: requestName,
          method: mock.method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS',
          url: mock.path,
          headers: headers,
          body: body,
          auth: null,
          order: 0
        });
        result.requestsMigrated++;

      } catch (err: any) {
        if (!err.message?.includes('UNIQUE constraint failed')) {
          result.errors.push(`Failed to migrate mock "${mock.method} ${mock.path}": ${err.message}`);
        }
      }
    }

    const rollbackData: RollbackData = {
      timestamp: new Date().toISOString(),
      workspaceId: workspaceId,
      projectId: projectId,
      collectionMappings,
      folderMappings,
      mockCount: oldMocks.length
    };
    result.rollbackData = rollbackData;

    await useStorage('settings').setItem('migration_rollback', rollbackData);
    await useStorage('settings').setItem('migration_completed', {
      timestamp: new Date().toISOString(),
      workspaceId,
      projectId,
      collectionsCreated: result.collectionsCreated,
      foldersCreated: result.foldersCreated,
      requestsMigrated: result.requestsMigrated
    });

    result.success = result.errors.length === 0;

    console.log(`✅ Migration completed: ${result.requestsMigrated} requests migrated`);

  } catch (err: any) {
    result.errors.push(`Migration failed: ${err.message}`);
    console.error('❌ Migration error:', err);
  }

  return result;
}

export async function rollbackMigration(): Promise<{ success: boolean; message: string }> {
  try {
    const rollbackData = await useStorage('settings').getItem('migration_rollback') as RollbackData | null;

    if (!rollbackData) {
      return { success: false, message: 'No migration rollback data found' };
    }

    const { workspaceId, projectId, collectionMappings, folderMappings } = rollbackData;

    const savedRequests = await db
      .select()
      .from(schema.savedRequests)
      .innerJoin(schema.folders, eq(schema.savedRequests.folderId, schema.folders.id))
      .innerJoin(schema.collections, eq(schema.folders.collectionId, schema.collections.id))
      .where(eq(schema.collections.projectId, projectId));

    for (const sr of savedRequests) {
      const body = sr.savedRequests.body as Record<string, any> | null;
      if (body?.originalMockId) {
        await useStorage('mocks').setItem(body.originalMockId, {
          id: body.originalMockId,
          collection: 'root',
          path: sr.savedRequests.url,
          method: sr.savedRequests.method,
          status: body.mockStatus || 200,
          response: body.mockResponse || {},
          delay: body.mockDelay || 0,
          secure: body.mockSecure || false,
          createdAt: new Date().toISOString()
        });
      }
    }

    await db.delete(schema.savedRequests)
      .where(eq(schema.savedRequests.id, ''));
    await db.delete(schema.folders)
      .where(eq(schema.folders.id, ''));
    await db.delete(schema.collections)
      .where(eq(schema.collections.projectId, projectId));
    await db.delete(schema.projects)
      .where(eq(schema.projects.id, projectId));
    await db.delete(schema.workspaces)
      .where(eq(schema.workspaces.id, workspaceId));

    await useStorage('settings').removeItem('migration_rollback');
    await useStorage('settings').removeItem('migration_completed');

    return { success: true, message: `Rollback completed. ${savedRequests.length} mocks restored.` };

  } catch (err: any) {
    console.error('❌ Rollback error:', err);
    return { success: false, message: `Rollback failed: ${err.message}` };
  }
}

export async function getMigrationStatus(): Promise<{
  isMigrated: boolean;
  migrationData?: {
    timestamp: string;
    workspaceId: string;
    projectId: string;
    collectionsCreated: number;
    foldersCreated: number;
    requestsMigrated: number;
  };
  mockCount: number;
  collectionCount: number;
}> {
  const mocksStorage = useStorage('mocks');
  const collectionsStorage = useStorage('collections');
  const mockKeys = await mocksStorage.getKeys();
  const collectionKeys = await collectionsStorage.getKeys();
  const migrationData = await useStorage('settings').getItem('migration_completed') as any;

  return {
    isMigrated: !!migrationData,
    migrationData: migrationData || undefined,
    mockCount: mockKeys.length,
    collectionCount: collectionKeys.length
  };
}
