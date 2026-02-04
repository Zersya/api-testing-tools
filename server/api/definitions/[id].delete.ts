import { db } from '../../db';
import { apiDefinitions } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');
    
    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID is required' });
    }
    
    try {
        const deleted = await db.delete(apiDefinitions).where(eq(apiDefinitions.id, id));
        
        if (deleted.changes === 0) {
            throw createError({ statusCode: 404, statusMessage: 'Definition not found' });
        }
        
        return { success: true };
    } catch (e: any) {
        if (e.statusCode) throw e;
        throw createError({ statusCode: 500, statusMessage: 'Failed to delete definition' });
    }
});