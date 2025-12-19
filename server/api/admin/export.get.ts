export default defineEventHandler(async (event) => {
    const mocksStorage = useStorage('mocks');
    const collectionsStorage = useStorage('collections');

    const mockKeys = await mocksStorage.getKeys();
    const collectionKeys = await collectionsStorage.getKeys();

    // Build collections map for tags
    const collectionsMap: Record<string, any> = {};
    for (const key of collectionKeys) {
        const collection = await collectionsStorage.getItem(key) as any;
        if (collection) {
            collectionsMap[collection.id] = collection;
        }
    }

    // Ensure root collection exists in map
    if (!collectionsMap['root']) {
        collectionsMap['root'] = { id: 'root', name: 'root', description: 'Default collection' };
    }

    const paths: Record<string, any> = {};
    const usedTags = new Set<string>();

    for (const key of mockKeys) {
        const mock = await mocksStorage.getItem(key) as any;
        if (!mock) continue;

        // Convert path params :id to {id}
        const openApiPath = mock.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

        if (!paths[openApiPath]) {
            paths[openApiPath] = {};
        }

        const method = mock.method.toLowerCase();
        const collectionId = mock.collection || 'root';
        const collectionName = collectionsMap[collectionId]?.name || 'root';
        usedTags.add(collectionName);

        // Extract parameters from path
        const parameters: { name: string; in: string; required: boolean; schema: { type: string } }[] = [];
        const paramMatches = mock.path.match(/:([a-zA-Z0-9_]+)/g);
        if (paramMatches) {
            paramMatches.forEach((param: string) => {
                parameters.push({
                    name: param.replace(':', ''),
                    in: 'path',
                    required: true,
                    schema: { type: 'string' }
                });
            });
        }

        // Infer schema from response (simple generic object)
        const contentSchema = {
            "application/json": {
                "schema": {
                    "type": "object",
                    "example": mock.response
                }
            }
        };

        paths[openApiPath][method] = {
            summary: `${mock.method} ${mock.path}`,
            tags: [collectionName],
            parameters,
            responses: {
                [mock.status]: {
                    description: "Mock response",
                    content: contentSchema
                }
            },
            security: mock.secure ? [{ bearerAuth: [] }] : []
        };
    }

    // Build tags array from used collections
    const tags = Array.from(usedTags).map(tagName => {
        const collection = Object.values(collectionsMap).find((c: any) => c.name === tagName);
        return {
            name: tagName,
            description: collection?.description || `Endpoints in ${tagName} collection`
        };
    });

    const spec = {
        openapi: "3.0.0",
        info: {
            title: "Mock Service API",
            version: "1.0.0"
        },
        tags,
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer"
                }
            }
        },
        paths
    };

    return spec;
});
