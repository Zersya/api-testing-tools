import { db } from '../../../db';
import { environments, environmentVariables, projects } from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface EnvironmentVariable {
  id: string;
  environmentId: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface EnvironmentWithVariables {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  variables: EnvironmentVariable[];
}

const updateEnvironmentSchema = {
  name: { type: 'string', minLength: 1, maxLength: 100 },
  isActive: { type: 'boolean' }
};

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

  const method = getMethod(event);

  if (method === 'GET') {
    const environment = await db.query.environments.findFirst({
      where: eq(environments.id, environmentId),
      with: {
        variables: true,
      },
    }) as EnvironmentWithVariables | undefined;

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

    const maskedVariables = environment.variables?.map((v: EnvironmentVariable) => ({
      ...v,
      value: v.isSecret ? '••••••••' : v.value,
    }));

    return {
      ...environment,
      variables: maskedVariables,
    };
  }

  if (method === 'PUT') {
    const body = await readBody(event);

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

    if (body.isActive === true) {
      await db.update(environments)
        .set({ isActive: false })
        .where(eq(environments.projectId, existing.projectId));
    }

    const [updated] = await db.update(environments)
      .set({
        name: body.name,
        isActive: body.isActive,
      })
      .where(eq(environments.id, environmentId))
      .returning();

    return updated;
  }

  if (method === 'DELETE') {
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

    await db.transaction(async (tx) => {
      await tx.delete(environmentVariables)
        .where(eq(environmentVariables.environmentId, environmentId));
      
      await tx.delete(environments)
        .where(eq(environments.id, environmentId));
    });

    return { success: true };
  }

  throw createError({
    statusCode: 405,
    message: 'Method not allowed',
  });
});
