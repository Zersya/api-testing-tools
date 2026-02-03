import { db } from '../db';
import { workspaces } from '../db/schema';
import { eq } from 'drizzle-orm';

const PERSONAL_WORKSPACE_ID = 'personal';
const PERSONAL_WORKSPACE_NAME = 'Personal';

export default defineNitroPlugin(async () => {
  try {
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
      console.log('✅ Default "Personal" workspace seeded');
    }
  } catch (error) {
    // Table might not exist yet on first run before migrations
    console.warn('⚠️ Could not seed workspace - run db:push first:', error);
  }
});
