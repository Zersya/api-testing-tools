import { d as defineEventHandler, g as getHeader, y as readMultipartFormData, r as readBody, b as db, p as projects, x as apiDefinitions } from '../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
import { i as isValidUrl, d as detectSpecFormat, p as parseYAML, a as parseOpenAPISpec } from '../../../_/yaml-parser.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'drizzle-orm/better-sqlite3';
import 'better-sqlite3';
import 'drizzle-orm/sqlite-core';
import 'node:url';
import 'jsonwebtoken';

const FETCH_TIMEOUT = 3e4;
const MAX_SPEC_SIZE = 10 * 1024 * 1024;
const import_post = defineEventHandler(async (event) => {
  try {
    const contentType = getHeader(event, "content-type") || "";
    let projectId;
    let name;
    let source;
    let url;
    let specContent;
    let isPublic = false;
    if (contentType.includes("multipart/form-data")) {
      const formData = await readMultipartFormData(event);
      if (!formData || formData.length === 0) {
        return {
          success: false,
          error: {
            message: "No file uploaded",
            code: "NO_FILE"
          }
        };
      }
      const fields = {};
      let fileContent = null;
      let fileName = null;
      for (const part of formData) {
        if (part.name === "file" && part.data) {
          fileContent = part.data.toString("utf-8");
          fileName = part.filename || null;
        } else if (part.name && part.data) {
          fields[part.name] = part.data.toString("utf-8");
        }
      }
      if (!fileContent) {
        return {
          success: false,
          error: {
            message: "No file content found",
            code: "NO_FILE_CONTENT"
          }
        };
      }
      if (!fields.projectId) {
        return {
          success: false,
          error: {
            message: "Project ID is required",
            code: "MISSING_PROJECT_ID"
          }
        };
      }
      projectId = fields.projectId;
      name = fields.name || (fileName == null ? void 0 : fileName.replace(/\.(json|yaml|yml)$/i, "")) || void 0;
      source = "file";
      specContent = fileContent;
      isPublic = fields.isPublic === "true";
    } else {
      const body = await readBody(event);
      if (!body) {
        return {
          success: false,
          error: {
            message: "Request body is required",
            code: "MISSING_BODY"
          }
        };
      }
      if (!body.projectId) {
        return {
          success: false,
          error: {
            message: "Project ID is required",
            code: "MISSING_PROJECT_ID"
          }
        };
      }
      if (!body.source) {
        return {
          success: false,
          error: {
            message: "Import source is required (file, url, or raw)",
            code: "MISSING_SOURCE"
          }
        };
      }
      projectId = body.projectId;
      name = body.name;
      source = body.source;
      isPublic = body.isPublic || false;
      if (source === "url") {
        if (!body.url) {
          return {
            success: false,
            error: {
              message: "URL is required for URL import",
              code: "MISSING_URL"
            }
          };
        }
        if (!isValidUrl(body.url)) {
          return {
            success: false,
            error: {
              message: "Invalid URL format. URL must start with http:// or https://",
              code: "INVALID_URL"
            }
          };
        }
        url = body.url;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
          const response = await fetch(body.url, {
            signal: controller.signal,
            headers: {
              "Accept": "application/json, application/yaml, text/yaml, text/plain, */*",
              "User-Agent": "MockService-OpenAPI-Importer/1.0"
            }
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
            return {
              success: false,
              error: {
                message: `Failed to fetch URL: ${response.status} ${response.statusText}`,
                code: "FETCH_FAILED"
              }
            };
          }
          const contentLength = response.headers.get("content-length");
          if (contentLength && parseInt(contentLength) > MAX_SPEC_SIZE) {
            return {
              success: false,
              error: {
                message: `Specification file is too large (max ${MAX_SPEC_SIZE / 1024 / 1024}MB)`,
                code: "FILE_TOO_LARGE"
              }
            };
          }
          specContent = await response.text();
          if (!specContent || specContent.trim().length === 0) {
            return {
              success: false,
              error: {
                message: "URL returned empty content",
                code: "EMPTY_CONTENT"
              }
            };
          }
        } catch (fetchError) {
          if (fetchError.name === "AbortError") {
            return {
              success: false,
              error: {
                message: "Request timed out while fetching URL",
                code: "FETCH_TIMEOUT"
              }
            };
          }
          return {
            success: false,
            error: {
              message: `Failed to fetch URL: ${fetchError.message}`,
              code: "FETCH_ERROR"
            }
          };
        }
      } else if (source === "raw") {
        if (!body.content) {
          return {
            success: false,
            error: {
              message: "Content is required for raw import",
              code: "MISSING_CONTENT"
            }
          };
        }
        if (body.content.length > MAX_SPEC_SIZE) {
          return {
            success: false,
            error: {
              message: `Specification content is too large (max ${MAX_SPEC_SIZE / 1024 / 1024}MB)`,
              code: "CONTENT_TOO_LARGE"
            }
          };
        }
        specContent = body.content;
      } else {
        return {
          success: false,
          error: {
            message: 'Invalid import source. Must be "file", "url", or "raw"',
            code: "INVALID_SOURCE"
          }
        };
      }
    }
    const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!project) {
      return {
        success: false,
        error: {
          message: "Project not found",
          code: "PROJECT_NOT_FOUND"
        }
      };
    }
    const format = detectSpecFormat(specContent);
    let parsedObject;
    try {
      if (format === "json") {
        parsedObject = JSON.parse(specContent);
      } else if (format === "yaml") {
        parsedObject = parseYAML(specContent);
      } else {
        try {
          parsedObject = JSON.parse(specContent);
        } catch (e) {
          try {
            parsedObject = parseYAML(specContent);
          } catch (yamlError) {
            return {
              success: false,
              error: {
                message: "Unable to parse specification. Content is neither valid JSON nor YAML.",
                code: "PARSE_ERROR",
                details: [{
                  path: "$",
                  message: yamlError.message || "Invalid format"
                }]
              }
            };
          }
        }
      }
    } catch (parseError) {
      return {
        success: false,
        error: {
          message: `Failed to parse specification: ${parseError.message}`,
          code: "PARSE_ERROR",
          details: [{
            path: "$",
            message: parseError.message
          }]
        }
      };
    }
    const parseResult = parseOpenAPISpec(parsedObject);
    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: {
          message: "Invalid OpenAPI specification",
          code: "VALIDATION_ERROR",
          details: parseResult.errors.map((e) => ({
            path: e.path,
            message: e.message
          }))
        }
      };
    }
    const parsedSpec = parseResult.data;
    const definitionName = name || parsedSpec.info.title || "Untitled API";
    const newDefinition = db.insert(apiDefinitions).values({
      projectId,
      name: definitionName,
      specFormat: "openapi3",
      specContent: JSON.stringify(parsedObject),
      // Store as JSON for consistency
      sourceUrl: url || null,
      isPublic
    }).returning().get();
    return {
      success: true,
      definition: {
        id: newDefinition.id,
        projectId: newDefinition.projectId,
        name: newDefinition.name,
        specFormat: newDefinition.specFormat,
        sourceUrl: newDefinition.sourceUrl,
        isPublic: newDefinition.isPublic,
        createdAt: newDefinition.createdAt
      },
      parsed: {
        info: parsedSpec.info,
        openApiVersion: parsedSpec.openApiVersion,
        endpointCount: parsedSpec.endpoints.length,
        schemaCount: Object.keys(parsedSpec.schemas).length,
        endpoints: parsedSpec.endpoints.map((ep) => ({
          path: ep.path,
          method: ep.method,
          operationId: ep.operationId,
          summary: ep.summary,
          description: ep.description,
          tags: ep.tags
        })),
        schemas: Object.keys(parsedSpec.schemas),
        servers: parsedSpec.servers,
        tags: parsedSpec.tags
      },
      warnings: parseResult.warnings.map((w) => ({
        path: w.path,
        message: w.message
      }))
    };
  } catch (error) {
    console.error("Error importing OpenAPI spec:", error);
    return {
      success: false,
      error: {
        message: "An unexpected error occurred while importing the specification",
        code: "INTERNAL_ERROR",
        details: [{
          path: "$",
          message: error.message || "Unknown error"
        }]
      }
    };
  }
});

export { import_post as default };
//# sourceMappingURL=import.post.mjs.map
