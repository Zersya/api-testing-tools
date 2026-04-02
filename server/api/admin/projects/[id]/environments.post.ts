import { db } from '../../../../db';
import { projects, environments } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { canEditWorkspace } from '../../../../utils/permissions';

interface CreateEnvironmentBody {
  name: string;
  isActive?: boolean;
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  const body = await readBody<CreateEnvironmentBody>(event);

  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment name is required'
    });
  }

  const trimmedName = body.name.trim();

  if (trimmedName.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment name cannot be empty'
    });
  }

  if (trimmedName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment name cannot exceed 100 characters'
    });
  }

  // Prevent manual creation of reserved CLOUD MOCK environment
  if (trimmedName.toUpperCase() === 'CLOUD MOCK') {
    throw createError({
      statusCode: 400,
      statusMessage: '"CLOUD MOCK" is a reserved environment name and is automatically created for each project'
    });
  }

  const project = (await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1))[0];

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    });
  }

  // Check if user can edit this workspace (owner or edit permission)
    const canEdit = await canEditWorkspace(user.id, project.workspaceId, user.email);
    if (!canEdit) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have edit access to this workspace'
      });
    }

  const existingEnvironments = await db
    .select()
    .from(environments)
    .where(eq(environments.projectId, projectId));

  const duplicate = existingEnvironments.find(
    e => e.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicate) {
    throw createError({
      statusCode: 409,
      statusMessage: `Environment "${trimmedName}" already exists in this project`
    });
  }

  const shouldBeActive = body.isActive === true || existingEnvironments.length === 0;
  
  if (shouldBeActive) {
    await db.update(environments)
      .set({ isActive: false })
      .where(eq(environments.projectId, projectId));
  }

  const insertResult = await db.insert(environments)
    .values({
      projectId,
      name: trimmedName,
      isActive: shouldBeActive
    })
    .returning();

  if (!insertResult || insertResult.length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create environment - no rows returned'
    });
  }

  return insertResult[0];
});
