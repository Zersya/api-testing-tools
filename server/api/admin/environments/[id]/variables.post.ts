import { db } from '../../../../db';
import { environments, environmentVariables, projects } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { canEditWorkspace } from '../../../../utils/permissions';

interface CreateVariableBody {
  key: string;
  value: string;
  isSecret?: boolean;
}

export default defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  const body = await readBody<CreateVariableBody>(event);

  // Validate required fields
  if (!body.key || typeof body.key !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable key is required'
    });
  }

  const trimmedKey = body.key.trim();

  if (trimmedKey.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable key cannot be empty'
    });
  }

  if (trimmedKey.length > 255) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable key cannot exceed 255 characters'
    });
  }

  // Validate key format (alphanumeric and underscores only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedKey)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable key must start with a letter or underscore and contain only alphanumeric characters and underscores'
    });
  }

  if (body.value === undefined || body.value === null) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable value is required'
    });
  }

  if (typeof body.value !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable value must be a string'
    });
  }

  try {
    // Verify environment exists
    const environment = (await db
      .select()
      .from(environments)
      .where(eq(environments.id, environmentId))
      .limit(1))[0];

    if (!environment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    // Get project to check workspace access
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, environment.projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user can edit this workspace (owner or edit permission)
    const canEdit = await canEditWorkspace(user.id, project.workspaceId);
    if (!canEdit) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have edit access to this workspace'
      });
    }

    // Check for duplicate keys within the environment (case-sensitive)
    const existingVariables = await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, environmentId));

    const duplicate = existingVariables.find(v => v.key === trimmedKey);

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Variable "${trimmedKey}" already exists in this environment`
      });
    }

    // Create the variable
    const newVariable = (await db
      .insert(environmentVariables)
      .values({
        environmentId,
        key: trimmedKey,
        value: body.value,
        isSecret: body.isSecret === true
      })
      .returning())[0];

    return {
      ...newVariable,
      // Mask secret values in response
      value: newVariable.isSecret ? '••••••••' : newVariable.value
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error creating environment variable:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create environment variable'
    });
  }
});
