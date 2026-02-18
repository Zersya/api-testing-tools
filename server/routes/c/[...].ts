/**
 * Mock Server Route
 * Pattern: /c/{collection-name}/{path}
 * 
 * Serves mock responses from savedRequests.mockConfig
 * Used when CLOUD MOCK environment is active
 */

import { db } from '../../db';
import { savedRequests, folders, collections } from '../../db/schema';
import type { MockConfig } from '../../db/schema/savedRequest';
import { eq, and } from 'drizzle-orm';

interface Collection {
    id: string;
    name: string;
}

export default defineEventHandler(async (event) => {
    const originalPath = event.path;
    const method = event.method;

    // Determine if this is a collection-specific request
    // Pattern: /c/{collection-name}/{actual-path}
    let targetCollectionId: string | null = null;
    let targetPath = originalPath;

    const collectionPathMatch = originalPath.match(/^\/c\/([^/]+)(\/.*)?$/);

    if (collectionPathMatch) {
        const collectionName = collectionPathMatch[1];
        targetPath = collectionPathMatch[2] || '/';

        // Find collection by name
        const collectionResult = await db
            .select()
            .from(collections)
            .where(eq(collections.name, collectionName))
            .limit(1);

        if (collectionResult.length > 0) {
            targetCollectionId = collectionResult[0].id;
        }

        // If collection name not found, return 404
        if (!targetCollectionId) {
            throw createError({
                statusCode: 404,
                statusMessage: `Collection "${collectionName}" not found`
            });
        }
    } else {
        // This shouldn't happen given the route location, but fallback safely
        throw createError({
            statusCode: 404,
            statusMessage: 'Invalid collection route'
        });
    }

    try {
        // Find all requests in the target collection
        const requestsWithFolders = await db
            .select({
                request: savedRequests,
                folder: folders
            })
            .from(savedRequests)
            .innerJoin(folders, eq(savedRequests.folderId, folders.id))
            .where(eq(folders.collectionId, targetCollectionId));

        // Find matching request by URL path and method
        const matchingRequest = requestsWithFolders.find(({ request }) => {
            // Match method
            if (request.method !== method) return false;

            // Match URL path (extract path from URL)
            const requestUrl = request.url;
            const requestPath = requestUrl.split('?')[0]; // Remove query params
            
            // Convert path pattern to regex for matching
            // Support path params like :id
            const regexPath = requestPath
                .replace(/:[^\s/]+/g, '([^/]+)') // Replace :param with capture group
                .replace(/\//g, '\\/'); // Escape slashes

            const regex = new RegExp(`^${regexPath}$`);
            return regex.test(targetPath);
        });

        if (!matchingRequest) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Mock not found'
            });
        }

        const { request } = matchingRequest;

        // Parse mockConfig
        let mockConfig: MockConfig = null;
        if (request.mockConfig) {
            try {
                mockConfig = typeof request.mockConfig === 'string'
                    ? JSON.parse(request.mockConfig)
                    : request.mockConfig;
            } catch (error) {
                console.error('Failed to parse mockConfig:', error);
            }
        }

        // Check if mock is enabled
        if (!mockConfig || !mockConfig.isEnabled) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Mock not configured for this request'
            });
        }

        // Apply delay if specified
        if (mockConfig.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, mockConfig.delay));
        }

        // Set response headers
        if (mockConfig.responseHeaders) {
            Object.entries(mockConfig.responseHeaders).forEach(([key, value]) => {
                setHeader(event, key, value);
            });
        }

        // Set status and return response
        setResponseStatus(event, mockConfig.statusCode || 200);
        return mockConfig.responseBody;

    } catch (error: any) {
        // Re-throw if it's already an H3 error
        if (error.statusCode) {
            throw error;
        }

        console.error('Error serving mock:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        });
    }
});
