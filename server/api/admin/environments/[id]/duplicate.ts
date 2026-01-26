import { db } from '../../../../db';
import { environments, environmentVariables, projects } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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

  const existing = await db.query.environments.findFirst({
    where: eq(environments.id, environmentId),
    with: {
      variables: true,
    },
  }) as EnvironmentWithVariables | undefined;

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

  const newEnvironmentName = body.name || `${existing.name} (Copy)`;

  const [newEnvironment] = await db.insert(environments)
    .values({
      id: randomUUID(),
      projectId: existing.projectId,
      name: newEnvironmentName,
      isActive: false,
    })
    .returning();

  if (existing.variables && existing.variables.length > 0) {
    await db.insert(environmentVariables)
      .values(existing.variables.map((v: EnvironmentVariable) => ({
        id: randomUUID(),
        environmentId: newEnvironment.id,
        key: v.key,
        value: v.value,
        isSecret: v.isSecret,
      })));
  }

  const result = await db.query.environments.findFirst({
    where: eq(environments.id, newEnvironment.id),
    with: {
      variables: true,
    },
  }) as EnvironmentWithVariables | undefined;

  if (result && result.variables) {
    result.variables = result.variables.map((v: EnvironmentVariable) => ({
      ...v,
      value: v.isSecret ? '••••••••' : v.value,
    }));
  }

  return result;
});
