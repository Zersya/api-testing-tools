import { db } from '../../../db';
import { apiDefinitions, mocks, collections } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { parseOpenAPISpec } from '../../../utils/openapi-parser';
import { generateMockData } from '../../../utils/schema-generator';
import { parseYAML } from '../../../utils/yaml-parser';
import { v4 as uuidv4 } from 'uuid';

function findResponse(endpoint: any, responseType: 'success' | 'error', schemas: Record<string, any>): { status: number; response: any } {
    const responses = endpoint.responses || {};
    
    // Default response for all mocks
    const defaultResponse = { status: 'ok' };
    
    if (responseType === 'success') {
        // Find first 2xx response
        const successKey = Object.keys(responses).find(k => k.startsWith('2'));
        if (successKey) {
            return { status: parseInt(successKey), response: defaultResponse };
        }
    } else {
        // Find first 4xx or 5xx response
        const errorKey = Object.keys(responses).find(k => k.startsWith('4') || k.startsWith('5'));
        if (errorKey) {
            return { status: parseInt(errorKey), response: defaultResponse };
        }
    }
    
    // Fallback: generate a default response
    if (responseType === 'success') {
        return { status: 200, response: defaultResponse };
    } else {
        return { status: 500, response: defaultResponse };
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

    const definition = (await db.select().from(apiDefinitions).where(eq(apiDefinitions.id, id)).limit(1))[0];

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

    console.log('[GenerateMocks] Total endpoints in spec:', parseResult.data.endpoints.length);
    console.log('[GenerateMocks] Selected endpoints:', selectedEndpoints.length);
    console.log('[GenerateMocks] First 5 selected:', selectedEndpoints.slice(0, 5));

    // Find collection ID from name
    let collectionId: string | null = null;
    if (targetCollection !== 'root') {
        const collection = await db.select().from(collections).where(eq(collections.name, targetCollection)).limit(1);
        if (collection.length > 0) {
            collectionId = collection[0].id;
        }
    }

    const generatedMocks = [];
    let skippedCount = 0;
    let matchCount = 0;

    for (const endpoint of parseResult.data.endpoints) {
        const endpointKey = `${endpoint.method}:${endpoint.path}`;
        const isSelected = selectedEndpoints.length === 0 || selectedEndpoints.includes(endpointKey);
        
        if (!isSelected) {
            skippedCount++;
            if (skippedCount <= 5) {
                console.log('[GenerateMocks] Skipping:', endpointKey);
            }
            continue;
        }
        
        matchCount++;
        if (matchCount <= 5) {
            console.log('[GenerateMocks] Processing:', endpointKey);
        }

        // Determine status code and response based on responseType
        const { status, response: responseData } = findResponse(endpoint, responseType, parseResult.data.schemas);

        // Check if mock already exists in the same collection
        const existingMocks = await db
            .select()
            .from(mocks)
            .where(and(
                eq(mocks.path, endpoint.path),
                eq(mocks.method, endpoint.method)
            ));
        
        const existingMock = existingMocks.find(m => 
            (collectionId && m.collectionId === collectionId) || 
            (!collectionId && !m.collectionId)
        );

        const mockId = existingMock?.id || uuidv4();
        const now = new Date();
        
        const newMock = {
            id: mockId,
            collectionId: collectionId,
            path: endpoint.path,
            method: endpoint.method,
            status,
            response: JSON.stringify(responseData),
            delay,
            secure: false,
            createdAt: now,
            updatedAt: now
        };

        if (existingMock) {
            // Update existing mock
            await db.update(mocks)
                .set({
                    status,
                    response: JSON.stringify(responseData),
                    delay,
                    updatedAt: now
                })
                .where(eq(mocks.id, mockId));
        } else {
            // Insert new mock
            await db.insert(mocks).values(newMock);
        }

        generatedMocks.push(newMock);
    }

    console.log('[GenerateMocks] Total processed:', matchCount, 'Skipped:', skippedCount, 'Generated:', generatedMocks.length);
    console.log('[GenerateMocks] Generated endpoint keys:', generatedMocks.map(m => `${m.method}:${m.path}`));

    return {
        success: true,
        count: generatedMocks.length,
        mocks: generatedMocks
    };
});
