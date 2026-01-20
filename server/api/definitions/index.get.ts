import { db } from '../../db';
import { apiDefinitions } from '../../db/schema';
import { desc } from 'drizzle-orm';
import { parseOpenAPISpec } from '../../utils/openapi-parser';
import { parseYAML } from '../../utils/yaml-parser';

export default defineEventHandler(async (event) => {
    try {
        const definitions = await db
            .select()
            .from(apiDefinitions)
            .orderBy(desc(apiDefinitions.updatedAt))
            .all();
        
        const result = definitions.map(def => {
            let endpointCount = 0;
            
            try {
                let specContent = def.specContent;
                let specObj: unknown = specContent;
                
                if (typeof specContent === 'string') {
                    const trimmed = specContent.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                        specObj = JSON.parse(specContent);
                    } else {
                        specObj = parseYAML(specContent);
                    }
                }
                
                const parseResult = parseOpenAPISpec(specObj);
                if (parseResult.success && parseResult.data) {
                    endpointCount = parseResult.data.endpoints.length;
                }
            } catch (e) {
                console.error(`Failed to parse spec for definition ${def.id}:`, e);
            }
            
            return {
                id: def.id,
                name: def.name,
                specFormat: def.specFormat,
                sourceUrl: def.sourceUrl,
                endpointCount,
                createdAt: def.createdAt,
                updatedAt: def.updatedAt
            };
        });
        
        return result;
    } catch (e) {
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch definitions' });
    }
});
