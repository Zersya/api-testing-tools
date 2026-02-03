import { db } from '../../../db';
import { projects, collections } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  try {
    // Get the project
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Get all collections for this project
    const projectCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.projectId, id))
      .orderBy(desc(collections.createdAt));

    return {
      ...project,
      collections: projectCollections
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching project:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch project'
    });
  }
});
