import { db } from './index';
import { workspaces, projects } from './schema';
import { eq } from 'drizzle-orm';

const PERSONAL_WORKSPACE_ID = 'personal';
const PERSONAL_WORKSPACE_NAME = 'Personal';
const DEFAULT_PROJECT_ID = 'default';
const DEFAULT_PROJECT_NAME = 'My Project';

export async function seedDefaultWorkspace(): Promise<void> {
  // Check if Personal workspace already exists
  const existingWorkspace = (await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, PERSONAL_WORKSPACE_ID))
    .limit(1))[0];

  if (!existingWorkspace) {
    await db.insert(workspaces).values({
      id: PERSONAL_WORKSPACE_ID,
      name: PERSONAL_WORKSPACE_NAME
    });
    console.log('✅ Default "Personal" workspace created');
  } else {
    console.log('ℹ️ Default "Personal" workspace already exists');
  }

  // Check if default project already exists
  const existingProject = (await db
    .select()
    .from(projects)
    .where(eq(projects.id, DEFAULT_PROJECT_ID))
    .limit(1))[0];

  if (!existingProject) {
    await db.insert(projects).values({
      id: DEFAULT_PROJECT_ID,
      workspaceId: PERSONAL_WORKSPACE_ID,
      name: DEFAULT_PROJECT_NAME
    });
    console.log('✅ Default "My Project" project created');
  } else {
    console.log('ℹ️ Default "My Project" project already exists');
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDefaultWorkspace()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
