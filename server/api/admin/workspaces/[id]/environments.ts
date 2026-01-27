import { eq, inArray } from 'drizzle-orm';
import { db } from '../../../../db';
import { environments, projects, environmentVariables } from '../../../../db/schema';

export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id');

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      message: 'Workspace ID is required',
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
