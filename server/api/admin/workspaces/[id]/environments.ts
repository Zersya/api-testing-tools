import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../../db';
import { environments, projects, environmentVariables } from '../../../../db/schema';
import { getAccessibleWorkspaceIds } from '../../../../utils/permissions';

export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID is required',
    });
  }

  // Check if user has access to this workspace
  const accessibleIds = await getAccessibleWorkspaceIds(user.id, user.email);
  if (!accessibleIds.includes(workspaceId)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have access to this workspace'
    });
  }

  const projectsInWorkspace = await db.query.projects.findMany({
    where: eq(projects.workspaceId, workspaceId),
  });

  if (projectsInWorkspace.length === 0) {
    return { environments: [], activeEnvironmentId: null };
  }

  const projectIds = projectsInWorkspace.map(p => p.id);

  const environmentsWithProjects = await db.query.environments.findMany({
    where: (environments, { inArray }) => inArray(environments.projectId, projectIds),
  });

  if (environmentsWithProjects.length === 0) {
    return { environments: [], activeEnvironmentId: null };
  }

  const environmentIds = environmentsWithProjects.map(e => e.id);

  const allVariables = await db.query.environmentVariables.findMany({
    where: (environmentVariables, { inArray }) => inArray(environmentVariables.environmentId, environmentIds),
  });

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

  const environmentsWithVariables = environmentsWithProjects.map(env => ({
    ...env,
    variables: variablesByEnvironment.get(env.id) || []
  }));

  const activeEnvironment = environmentsWithVariables.find(e => e.isActive);

  return {
    environments: environmentsWithVariables,
    activeEnvironmentId: activeEnvironment?.id || null,
  };
});
