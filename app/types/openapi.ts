export interface OpenAPIValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface OpenAPIEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  security?: Record<string, string[]>[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  example?: unknown;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, {
    schema?: OpenAPISchema;
    example?: unknown;
    examples?: Record<string, unknown>;
  }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, {
    schema?: OpenAPISchema;
    example?: unknown;
    examples?: Record<string, unknown>;
  }>;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, OpenAPISchema>;
  items?: OpenAPISchema;
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  $ref?: string;
  title?: string;
}

export interface ParsedOpenAPISpec {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: { url: string; description?: string }[];
  tags?: string[];
  endpoints: OpenAPIEndpoint[];
  schemas: Record<string, OpenAPISchema>;
  securitySchemes?: Record<string, {
    type: string;
    scheme?: string;
    bearerFormat?: string;
    flows?: Record<string, unknown>;
  }>;
}
