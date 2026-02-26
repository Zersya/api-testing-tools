import { db } from '../../../../db';
import { projects, environments, environmentVariables } from '../../../../db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../../../utils/permissions';

interface EnvironmentWithVariables {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  isMockEnvironment: boolean;
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
  const user = event.context.user;

  if (!user?.id || !user?.email) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  try {
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user has access to this workspace (including shared/invited access)
    const accessibleIds = await getAccessibleWorkspaceIds(user.id, user.email);
    if (!accessibleIds.includes(project.workspaceId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this workspace'
      });
    }

    const projectEnvironments = await db
      .select({
        id: environments.id,
        projectId: environments.projectId,
        name: environments.name,
        isActive: environments.isActive,
        isMockEnvironment: environments.isMockEnvironment,
        createdAt: environments.createdAt
      })
      .from(environments)
      .where(eq(environments.projectId, projectId))
      .orderBy(desc(environments.createdAt));

    if (projectEnvironments.length === 0) {
      return [];
    }

    const environmentIds = projectEnvironments.map(env => env.id);

    const allVariables = await db
      .select()
      .from(environmentVariables)
      .where(inArray(environmentVariables.environmentId, environmentIds));

    const variablesByEnvironment = new Map<string, typeof allVariables>();
    for (const envId of environmentIds) {
      variablesByEnvironment.set(envId, []);
    }

    for (const variable of allVariables) {
      const variables = variablesByEnvironment.get(variable.environmentId);
      if (variables) {
        variables.push({
          ...variable,
          value: variable.isSecret ? '••••••••' : variable.value
        });
      }
    }

    const environmentsWithVariables: EnvironmentWithVariables[] = projectEnvironments.map(env => ({
      ...env,
      variables: variablesByEnvironment.get(env.id) || []
    }));

    return environmentsWithVariables;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching environments:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch environments: ' + error.message
    });
  }
});
