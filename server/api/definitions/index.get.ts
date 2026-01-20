import { db } from '../../db';
import { apiDefinitions } from '../../db/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    try {
        const result = await db
            .select({
                id: apiDefinitions.id,
                name: apiDefinitions.name,
                specFormat: apiDefinitions.specFormat,
                createdAt: apiDefinitions.createdAt,
                updatedAt: apiDefinitions.updatedAt
            })
            .from(apiDefinitions)
            .orderBy(desc(apiDefinitions.createdAt))
            .all();
        
        return result;
    } catch (e) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch definitions' });
    }
});
