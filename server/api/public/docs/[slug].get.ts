import { db } from '../../../db';
import { apiDefinitions } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { parseOpenAPISpec } from '../../../utils/openapi-parser';
import { parseYAML } from '../../../utils/yaml-parser';

export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug');
    
    if (!slug) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Slug is required' 
      });
    }

    const definition = (await db
      .select()
      .from(apiDefinitions)
      .where(eq(apiDefinitions.publicSlug, slug))
      .limit(1))[0];

    if (!definition) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Public documentation not found' 
      });
    }

    if (!definition.isPublic) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Public documentation not found' 
      });
    }

    let specObj: unknown;
    
    try {
      if (typeof definition.specContent === 'string') {
        const trimmed = definition.specContent.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          specObj = JSON.parse(definition.specContent);
        } else {
          specObj = parseYAML(definition.specContent);
        }
      } else {
        specObj = definition.specContent;
      }
      
      const parseResult = parseOpenAPISpec(specObj);
      
      if (!parseResult.success || !parseResult.data) {
        throw createError({ 
          statusCode: 500, 
          statusMessage: 'Failed to parse API specification' 
        });
      }

      return {
        definition: {
          id: definition.id,
          name: definition.name,
          specFormat: definition.specFormat
        },
        spec: parseResult.data
      };
      
    } catch (e) {
      console.error('Error parsing spec:', e);
      throw createError({ 
        statusCode: 500, 
        statusMessage: 'Failed to parse API specification' 
      });
    }
    
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error('Error fetching public doc:', error);
    throw createError({ 
      statusCode: 500, 
      statusMessage: 'Failed to fetch public documentation' 
    });
  }
});