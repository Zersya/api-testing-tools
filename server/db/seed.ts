import { db } from './index';
import { workspaces } from './schema';
import { eq } from 'drizzle-orm';

const PERSONAL_WORKSPACE_ID = 'personal';
const PERSONAL_WORKSPACE_NAME = 'Personal';

export async function seedDefaultWorkspace(): Promise<void> {
  // Check if Personal workspace already exists
  const existing = (await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, PERSONAL_WORKSPACE_ID))
    .limit(1))[0];

  if (!existing) {
    await db.insert(workspaces).values({
      id: PERSONAL_WORKSPACE_ID,
      name: PERSONAL_WORKSPACE_NAME
    });
    console.log('✅ Default "Personal" workspace created');
  } else {
    console.log('ℹ️ Default "Personal" workspace already exists');
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
