import { db } from '../../../../db';
import { environments, environmentVariables, projects } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../../../utils/permissions';

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

    // Get project to check workspace access
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, existingEnvironment.projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user has access to this workspace
    const accessibleIds = await getAccessibleWorkspaceIds(user.id);
    if (!accessibleIds.includes(project.workspaceId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this workspace'
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