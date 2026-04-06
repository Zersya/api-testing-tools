import { db } from '../../../db';
import { environments, environmentVariables, projects } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../../utils/permissions';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  try {
    // Get the environment
    const environment = (await db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .limit(1))[0];

    if (!environment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    // Get project to check workspace access
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, environment.projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user has access to this workspace
    const accessibleIds = await getAccessibleWorkspaceIds(user.id, user.email);
    if (!accessibleIds.includes(project.workspaceId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this workspace'
      });
    }

    // Get all variables for this environment
    const variables = await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, id));

    return {
      ...environment,
      variables: variables.map(v => ({
        ...v,
        // Mask secret values
        value: v.isSecret ? '••••••••' : v.value
      }))
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch environment'
    });
  }
});
