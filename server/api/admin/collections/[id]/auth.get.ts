import { db } from '../../../../db'
import { collections } from '../../../../db/schema'
import { eq } from 'drizzle-orm'

function parseJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection ID is required'
    })
  }

  try {
    const collection = (await db
      .select({
        id: collections.id,
        name: collections.name,
        authConfig: collections.authConfig
      })
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1))[0]

    if (!collection) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Collection not found'
      })
    }

    return {
      authConfig: parseJsonField<Record<string, unknown>>(collection.authConfig),
      collectionName: collection.name
    }
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    console.error('Error fetching collection auth:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch collection auth'
    })
  }
})