import { db } from '../../db';
import { apiDefinitions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { parseOpenAPISpec } from '../../utils/openapi-parser';
import { parseYAML } from '../../utils/yaml-parser';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');
    
    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'ID is required' });
    }

    const definition = db.select().from(apiDefinitions).where(eq(apiDefinitions.id, id)).get();

    if (!definition) {
        throw createError({ statusCode: 404, statusMessage: 'Definition not found' });
    }

    // Parse spec to return endpoints info
    let specContent = definition.specContent;
    let specObj: unknown = specContent;
    
    try {
        if (typeof specContent === 'string') {
            const trimmed = specContent.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                specObj = JSON.parse(specContent);
            } else {
                specObj = parseYAML(specContent);
            }
        }
    } catch (e) {
        // Return raw content if parsing fails, let UI handle it? 
        // Or just return minimal info.
    }

    let parsedInfo = null;
    const parseResult = parseOpenAPISpec(specObj);
    if (parseResult.success && parseResult.data) {
        parsedInfo = {
            endpoints: parseResult.data.endpoints.map(ep => ({
                method: ep.method,
                path: ep.path,
                summary: ep.summary
            }))
        };
    }

    return {
        ...definition,
        parsedInfo
    };
});
