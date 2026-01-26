import { eq, and } from 'drizzle-orm';
import { db } from '../../../../db';
import { environmentVariables, environments, projects } from '../../../../db/schema';

export default defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, 'id');

  if (!environmentId) {
    throw createError({
      statusCode: 400,
      message: 'Environment ID is required',
    });
  }

  const userId = event.context?.user?.id;
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const environment = await db.query.environments.findFirst({
    where: eq(environments.id, environmentId),
  });

  if (!environment) {
    throw createError({
      statusCode: 404,
      message: 'Environment not found',
    });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, environment.projectId),
  });

  if (!project || project.workspaceId !== event.context.user.workspaceId) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    });
  }

  const variables = await db.query.environmentVariables.findMany({
    where: eq(environmentVariables.environmentId, environmentId),
  });

  return variables.map(v => ({
    ...v,
    value: v.isSecret ? '••••••••' : v.value,
  }));
});
