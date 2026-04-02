import { db } from '../../../../db'
import { collections } from '../../../../db/schema'
import { eq } from 'drizzle-orm'
import { cache, CacheKeys } from '../../../../utils/cache'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection ID is required'
    })
  }

  const body = await readBody(event)

  if (!body || !body.authConfig) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Auth configuration is required'
    })
  }

  try {
    // Check if collection exists
    const existing = (await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1))[0]

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Collection not found'
      })
    }

    // Update the collection with auth config
    const updated = (await db
      .update(collections)
      .set({
        authConfig: body.authConfig
      })
      .where(eq(collections.id, id))
      .returning())[0]

    // Clear the tree cache so fresh data is loaded
    const user = event.context.user
    if (user?.id) {
      cache.delete(CacheKeys.workspaceTree(user.id))
    }

    return {
      authConfig: updated.authConfig,
      collectionName: updated.name
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    console.error('Error saving collection auth:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save collection auth'
    })
  }
})