export default defineEventHandler(async (event) => {
    const storage = useStorage('mocks');
    const keys = await storage.getKeys();

    const paths: Record<string, any> = {};

    for (const key of keys) {
        const mock = await storage.getItem(key) as any;
        if (!mock) continue;

        // Convert path params :id to {id}
        const openApiPath = mock.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

        if (!paths[openApiPath]) {
            paths[openApiPath] = {};
        }

        const method = mock.method.toLowerCase();

        // Extract parameters from path
        const parameters = [];
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

    const spec = {
        openapi: "3.0.0",
        info: {
            title: "Mock Service API",
            version: "1.0.0"
        },
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
