import { db } from '../../../../../db';
import { environmentVariables, environments, projects } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const VALID_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

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

  if (!body.key || typeof body.key !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Key is required',
    });
  }

  const trimmedKey = body.key.trim();

  if (trimmedKey.length === 0 || trimmedKey.length > 100) {
    throw createError({
      statusCode: 400,
      message: 'Key must be between 1 and 100 characters',
    });
  }

  if (!VALID_KEY_PATTERN.test(trimmedKey)) {
    throw createError({
      statusCode: 400,
      message: 'Key must start with a letter or underscore and contain only letters, numbers, and underscores',
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

  const duplicateKey = await db.query.environmentVariables.findFirst({
    where: and(
      eq(environmentVariables.environmentId, environmentId),
      eq(environmentVariables.key, trimmedKey)
    ),
  });

  if (duplicateKey) {
    throw createError({
      statusCode: 409,
      message: `Variable "${trimmedKey}" already exists in this environment`,
    });
  }

  const [variable] = await db.insert(environmentVariables)
    .values({
      id: randomUUID(),
      environmentId,
      key: trimmedKey,
      value: body.value || '',
      isSecret: body.isSecret === true,
    })
    .returning();

  return {
    ...variable,
    value: variable.isSecret ? '••••••••' : variable.value,
  };
});
