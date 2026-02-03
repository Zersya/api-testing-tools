import { db } from '../../../../db';
import { environments, environmentVariables } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const environmentId = getRouterParam(event, 'id');

  if (!environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  try {
    const existingEnvironment = (await db
      .select()
      .from(environments)
      .where(eq(environments.id, environmentId))
      .limit(1))[0];

    if (!existingEnvironment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    const name = existingEnvironment.name + ' (Copy)';
    let finalName = name;

    let counter = 1;
    const environmentsInProject = await db
      .select()
      .from(environments)
      .where(eq(environments.projectId, existingEnvironment.projectId));

    while (environmentsInProject.some(e => e.name.toLowerCase() === finalName.toLowerCase())) {
      finalName = `${name} (${counter})`;
      counter++;
    }

    await db.update(environments)
      .set({ isActive: false })
      .where(eq(environments.projectId, existingEnvironment.projectId));

    const newEnvironment = (await db
      .insert(environments)
      .values({
        projectId: existingEnvironment.projectId,
        name: finalName,
        isActive: true
      })
      .returning())[0];

    const variablesToCopy = await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, environmentId));

    for (const variable of variablesToCopy) {
      await db.insert(environmentVariables)
        .values({
          environmentId: newEnvironment.id,
          key: variable.key,
          value: variable.value,
          isSecret: variable.isSecret
        });
    }

    return {
      ...newEnvironment,
      variableCount: variablesToCopy.length
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error duplicating environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to duplicate environment'
    });
  }
});