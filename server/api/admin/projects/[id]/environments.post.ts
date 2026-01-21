import { db } from '../../../../db';
import { projects, environments } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

interface CreateEnvironmentBody {
  name: string;
  isActive?: boolean;
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  const body = await readBody<CreateEnvironmentBody>(event);

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment name is required'
    });
  }

  const trimmedName = body.name.trim();

  if (trimmedName.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment name cannot be empty'
    });
  }

  if (trimmedName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment name cannot exceed 100 characters'
    });
  }

  try {
    // Verify project exists
    const project = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check for duplicate environment names within the project (case-insensitive)
    const existingEnvironments = db
      .select()
      .from(environments)
      .where(eq(environments.projectId, projectId))
      .all();

    const duplicate = existingEnvironments.find(
      e => e.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Environment "${trimmedName}" already exists in this project`
      });
    }

    // If this environment should be active, deactivate all other environments first
    const shouldBeActive = body.isActive === true || existingEnvironments.length === 0;
    
    if (shouldBeActive) {
      // Deactivate all existing environments
      db.update(environments)
        .set({ isActive: false })
        .where(eq(environments.projectId, projectId))
        .run();
    }

    // Create the environment
    const newEnvironment = db
      .insert(environments)
      .values({
        projectId,
        name: trimmedName,
        isActive: shouldBeActive
      })
      .returning()
      .get();

    return newEnvironment;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error creating environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create environment'
    });
  }
});
