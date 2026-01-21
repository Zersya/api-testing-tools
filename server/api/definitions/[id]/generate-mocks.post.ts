import { db } from '../../../db';
import { apiDefinitions } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { parseOpenAPISpec } from '../../../utils/openapi-parser';
import { generateMockData } from '../../../utils/schema-generator';
import { parseYAML } from '../../../utils/yaml-parser';
import { v4 as uuidv4 } from 'uuid';

function findResponse(endpoint: any, responseType: 'success' | 'error', schemas: Record<string, any>): { status: number; response: any } {
    const responses = endpoint.responses || {};
    
    if (responseType === 'success') {
        // Find first 2xx response
        const successKey = Object.keys(responses).find(k => k.startsWith('2'));
        if (successKey) {
            const responseObj = responses[successKey];
            let responseData = {};
            
            if (responseObj.content && responseObj.content['application/json']) {
                const mediaType = responseObj.content['application/json'];
                
                if (mediaType.example) {
                    responseData = mediaType.example;
                } else if (mediaType.examples) {
                    const firstExample = Object.values(mediaType.examples)[0];
                    responseData = firstExample.value || {};
                } else if (mediaType.schema) {
                    responseData = generateMockData(mediaType.schema, schemas);
                }
            }
            
            return { status: parseInt(successKey), response: responseData };
        }
    } else {
        // Find first 4xx or 5xx response
        const errorKey = Object.keys(responses).find(k => k.startsWith('4') || k.startsWith('5'));
        if (errorKey) {
            const responseObj = responses[errorKey];
            let responseData = {};
            
            if (responseObj.content && responseObj.content['application/json']) {
                const mediaType = responseObj.content['application/json'];
                
                if (mediaType.example) {
                    responseData = mediaType.example;
                } else if (mediaType.examples) {
                    const firstExample = Object.values(mediaType.examples)[0];
                    responseData = firstExample.value || {};
                } else if (mediaType.schema) {
                    responseData = generateMockData(mediaType.schema, schemas);
                }
            }
            
            return { status: parseInt(errorKey), response: responseData };
        }
    }
    
    // Fallback: generate a default response
    if (responseType === 'success') {
        return { status: 200, response: { message: 'Success' } };
    } else {
        return { status: 500, response: { error: 'Internal Server Error' } };
    }
}

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');
    const body = await readBody(event);
    
    // endpoints is an array of strings like "GET:/users"
    // If empty, we can choose to generate none or all. Usually UI drives this.
    // Let's assume if it's provided, we filter. If not provided or empty, maybe generate all?
    // The requirement says "Select which endpoints to mock". So likely user provides list.
    const selectedEndpoints = body.endpoints as string[] || [];
    const targetCollection = body.collection || 'root';
    const delay = body.delay || 0;
    const responseType = (body.responseType || 'success') as 'success' | 'error';

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Definition ID is required' });
    }

    const definition = db.select().from(apiDefinitions).where(eq(apiDefinitions.id, id)).get();

    if (!definition) {
        throw createError({ statusCode: 404, statusMessage: 'Definition not found' });
    }

    // Parse OpenAPI Spec
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
        console.error('Failed to parse spec content:', e);
        throw createError({ statusCode: 500, statusMessage: 'Failed to parse API Definition content' });
    }

    const parseResult = parseOpenAPISpec(specObj);
    if (!parseResult.success || !parseResult.data) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid API Definition: ' + (parseResult.errors[0]?.message || 'Unknown error') });
    }

    const storage = useStorage('mocks');
    const generatedMocks = [];

    for (const endpoint of parseResult.data.endpoints) {
        const endpointKey = `${endpoint.method}:${endpoint.path}`;
        
        // Filter if specific endpoints requested
        // If selectedEndpoints is provided, we MUST check it.
        if (selectedEndpoints.length > 0 && !selectedEndpoints.includes(endpointKey)) {
            continue;
        }

        // Determine status code and response based on responseType
        const { status, response: responseData } = findResponse(endpoint, responseType, parseResult.data.schemas);

        // Check if mock already exists in the same collection
        // To do this efficiently without reading all keys, we might just overwrite or create new ID.
        // The mocks storage is flat key-value. 
        // Logic in mocks.post.ts iterates all keys to check for duplicates. 
        // We can do the same if we want to update existing instead of creating duplicates.
        // But for bulk generation, creating duplicates with new IDs is messy.
        // Let's check for existing mock with same method/path/collection.
        
        const keys = await storage.getKeys();
        let existingMockId: string | null = null;
        
        for (const key of keys) {
            const mock: any = await storage.getItem(key);
            if (mock && 
                mock.path === endpoint.path && 
                mock.method === endpoint.method && 
                (mock.collection || 'root') === targetCollection) {
                existingMockId = key;
                break;
            }
        }

        const mockId = existingMockId || uuidv4();
        const newMock = {
            id: mockId,
            collection: targetCollection,
            path: endpoint.path,
            method: endpoint.method,
            status,
            response: responseData,
            delay,
            secure: false, 
            createdAt: new Date().toISOString(),
            sourceDefinitionId: id 
        };

        await storage.setItem(mockId, newMock);
        generatedMocks.push(newMock);
    }

    return {
        success: true,
        count: generatedMocks.length,
        mocks: generatedMocks
    };
});
