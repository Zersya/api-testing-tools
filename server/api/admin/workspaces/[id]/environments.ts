import { eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { environments, projects } from '../../../../db/schema';

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
    with: {
      variables: true,
    },
  });

  const activeEnvironment = environmentsWithProjects.find(e => e.isActive);

  return {
    environments: environmentsWithProjects,
    activeEnvironmentId: activeEnvironment?.id || null,
  };
});
