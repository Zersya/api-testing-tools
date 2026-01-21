import { db } from '../../db';
import { apiDefinitions } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface UpdateBody {
  name?: string;
  isPublic?: boolean;
  publicSlug?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id');
    
    if (!id) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Definition ID is required' 
      });
    }

    const body = await readBody<UpdateBody>(event);
    
    if (!body || Object.keys(body).length === 0) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'No update data provided' 
      });
    }

    const updateData: Record<string, any> = {};
    
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    
    if (body.isPublic !== undefined) {
      updateData.isPublic = body.isPublic;
      
      if (body.isPublic && !body.publicSlug) {
        updateData.publicSlug = body.name?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || crypto.randomUUID().slice(0, 8);
      }
      
      if (!body.isPublic) {
        updateData.publicSlug = null;
      }
    }
    
    if (body.publicSlug !== undefined) {
      if (body.isPublic === false) {
        throw createError({ 
          statusCode: 400, 
          statusMessage: 'Cannot set publicSlug when isPublic is false' 
        });
      }
      
      const slug = body.publicSlug.trim().toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      if (!slug) {
        throw createError({ 
          statusCode: 400, 
          statusMessage: 'Invalid publicSlug' 
        });
      }
      
      const existing = db
        .select()
        .from(apiDefinitions)
        .where(eq(apiDefinitions.publicSlug, slug))
        .get();
      
      if (existing && existing.id !== id) {
        throw createError({ 
          statusCode: 409, 
          statusMessage: 'Public slug already in use' 
        });
      }
      
      updateData.publicSlug = slug;
      updateData.isPublic = true;
      updateData.updatedAt = new Date();
    }

    const updated = db
      .update(apiDefinitions)
      .set(updateData)
      .where(eq(apiDefinitions.id, id))
      .returning()
      .get();

    if (!updated) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Definition not found' 
      });
    }

    return updated;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error('Error updating definition:', error);
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Failed to update definition' 
    });
  }
});