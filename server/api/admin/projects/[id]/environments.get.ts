import { db } from '../../../../db';
import { projects, environments, environmentVariables } from '../../../../db/schema';
import { eq, desc } from 'drizzle-orm';

interface EnvironmentWithVariables {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  variables: {
    id: string;
    environmentId: string;
    key: string;
    value: string;
    isSecret: boolean;
  }[];
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
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

    // Get all environments for this project
    const projectEnvironments = db
      .select()
      .from(environments)
      .where(eq(environments.projectId, projectId))
      .orderBy(desc(environments.createdAt))
      .all();

    // Build environments with their variables
    const environmentsWithVariables: EnvironmentWithVariables[] = projectEnvironments.map(env => {
      // Get all variables for this environment
      const variables = db
        .select()
        .from(environmentVariables)
        .where(eq(environmentVariables.environmentId, env.id))
        .all();

      return {
        ...env,
        variables: variables.map(v => ({
          ...v,
          // Mask secret values
          value: v.isSecret ? '••••••••' : v.value
        }))
      };
    });

    return environmentsWithVariables;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching environments:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch environments'
    });
  }
});
