import { db } from '../../../db';
import { environmentVariables } from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface UpdateVariableBody {
  key?: string;
  value?: string;
  isSecret?: boolean;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable ID is required'
    });
  }

  const body = await readBody<UpdateVariableBody>(event);

  // Validate that at least one field is provided
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one field must be provided for update'
    });
  }

  try {
    // Check if variable exists
    const existing = (await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment variable not found'
      });
    }

    // Prepare update data
    const updateData: Partial<{ key: string; value: string; isSecret: boolean }> = {};

    if (body.key !== undefined) {
      if (typeof body.key !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Variable key must be a string'
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

      // Check for duplicate keys within the same environment (case-sensitive), excluding current variable
      const variablesInEnvironment = await db
        .select()
        .from(environmentVariables)
        .where(eq(environmentVariables.environmentId, existing.environmentId));

      const duplicate = variablesInEnvironment.find(
        v => v.id !== id && v.key === trimmedKey
      );

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Variable "${trimmedKey}" already exists in this environment`
        });
      }

      updateData.key = trimmedKey;
    }

    if (body.value !== undefined) {
      if (typeof body.value !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Variable value must be a string'
        });
      }
      updateData.value = body.value;
    }

    if (body.isSecret !== undefined) {
      if (typeof body.isSecret !== 'boolean') {
        throw createError({
          statusCode: 400,
          statusMessage: 'isSecret must be a boolean'
        });
      }
      updateData.isSecret = body.isSecret;
    }

    // Update the variable
    const updatedVariable = (await db
      .update(environmentVariables)
      .set(updateData)
      .where(eq(environmentVariables.id, id))
      .returning())[0];

    return {
      ...updatedVariable,
      // Mask secret values in response
      value: updatedVariable.isSecret ? '••••••••' : updatedVariable.value
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating environment variable:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update environment variable'
    });
  }
});
