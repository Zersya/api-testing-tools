import { db } from '../../db';
import { workspaces } from '../../db/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const allWorkspaces = db
      .select()
      .from(workspaces)
      .orderBy(desc(workspaces.createdAt))
      .all();

    return allWorkspaces;
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch workspaces'
    });
  }
});
