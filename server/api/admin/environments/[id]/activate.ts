import { db } from '../../../../db';
import { environments, projects } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, 'id');
  const body = await readBody(event);

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

  const parsed = {
    projectId: body.projectId
  };

  const existing = await db.query.environments.findFirst({
    where: eq(environments.id, environmentId),
  });

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Environment not found',
    });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, existing.projectId),
  });

  if (!project || project.workspaceId !== event.context.user.workspaceId) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
    });
  }

  if (existing.projectId !== parsed.projectId) {
    throw createError({
      statusCode: 400,
      message: 'Environment does not belong to this project',
    });
  }

  await db.transaction(async (tx) => {
    await tx.update(environments)
      .set({ isActive: false })
      .where(eq(environments.projectId, existing.projectId));

    await tx.update(environments)
      .set({
        isActive: true,
      })
      .where(eq(environments.id, environmentId));
  });

  const updated = await db.query.environments.findFirst({
    where: eq(environments.id, environmentId),
  });

  return updated;
});
