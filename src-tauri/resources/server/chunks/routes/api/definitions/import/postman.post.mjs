import { d as defineEventHandler, g as getHeader, y as readMultipartFormData, r as readBody, b as db, p as projects, i as collections, f as folders, e as savedRequests, j as environments, k as environmentVariables } from '../../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
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

const VALID_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
function parsePostmanCollection(data) {
  const errors = [];
  const warnings = [];
  if (!data || typeof data !== "object") {
    errors.push({
      path: "$",
      message: "Invalid Postman collection: must be a valid JSON object",
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const collection = data;
  if (!collection.info || typeof collection.info !== "object") {
    errors.push({
      path: "$.info",
      message: 'Missing required field "info"',
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const info = collection.info;
  if (!info.schema) {
    errors.push({
      path: "$.info.schema",
      message: 'Missing required field "info.schema"',
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  if (!info.schema.includes("v2.1.0") && !info.schema.includes("v2.0.0")) {
    warnings.push({
      path: "$.info.schema",
      message: `Schema version "${info.schema}" may not be fully compatible. Best support is for v2.1.0`,
      severity: "warning"
    });
  }
  if (!info.name || typeof info.name !== "string") {
    errors.push({
      path: "$.info.name",
      message: 'Missing required field "info.name"',
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  if (!collection.item || !Array.isArray(collection.item)) {
    errors.push({
      path: "$.item",
      message: 'Missing required field "item" or it is not an array',
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const folders = [];
  const rootRequests = [];
  const collectionVariables = [];
  if (Array.isArray(collection.variable)) {
    for (const variable of collection.variable) {
      if (variable.key && !variable.disabled) {
        collectionVariables.push({
          key: variable.key,
          value: variable.value || "",
          isSecret: variable.type === "secret"
        });
      }
    }
  }
  const collectionAuth = collection.auth ? parsePostmanAuth(collection.auth) : null;
  let orderCounter = 0;
  for (const item of collection.item) {
    const result = parsePostmanItem(item, orderCounter, "", warnings);
    orderCounter++;
    if (result.type === "folder") {
      folders.push(result.folder);
    } else if (result.type === "request") {
      rootRequests.push(result.request);
    }
  }
  const parsedCollection = {
    name: info.name,
    description: extractDescription(info.description),
    folders,
    requests: rootRequests,
    variables: collectionVariables,
    auth: collectionAuth
  };
  return {
    success: true,
    data: parsedCollection,
    errors,
    warnings
  };
}
function parsePostmanEnvironment(data) {
  const errors = [];
  if (!data || typeof data !== "object") {
    errors.push({
      path: "$",
      message: "Invalid Postman environment: must be a valid JSON object",
      severity: "error"
    });
    return { success: false, errors };
  }
  const env = data;
  if (!env.name || typeof env.name !== "string") {
    errors.push({
      path: "$.name",
      message: 'Missing required field "name"',
      severity: "error"
    });
    return { success: false, errors };
  }
  if (!env.values || !Array.isArray(env.values)) {
    errors.push({
      path: "$.values",
      message: 'Missing required field "values" or it is not an array',
      severity: "error"
    });
    return { success: false, errors };
  }
  const variables = [];
  for (const value of env.values) {
    if (value.key && value.enabled !== false) {
      variables.push({
        key: value.key,
        value: value.value || "",
        isSecret: value.type === "secret"
      });
    }
  }
  return {
    success: true,
    data: {
      name: env.name,
      variables
    },
    errors
  };
}
function parsePostmanItem(item, order, parentPath, warnings) {
  if (item.item && Array.isArray(item.item)) {
    const subfolders = [];
    const folderRequests = [];
    let childOrder = 0;
    for (const childItem of item.item) {
      const result = parsePostmanItem(childItem, childOrder, item.name, warnings);
      childOrder++;
      if (result.type === "folder") {
        subfolders.push(result.folder);
      } else if (result.type === "request") {
        folderRequests.push(result.request);
      }
    }
    return {
      type: "folder",
      folder: {
        name: item.name || "Unnamed Folder",
        description: extractDescription(item.description),
        parentPath: parentPath || void 0,
        subfolders,
        requests: folderRequests,
        order
      }
    };
  }
  if (item.request) {
    const request = parsePostmanRequest(item, order, warnings);
    return {
      type: "request",
      request
    };
  }
  warnings.push({
    path: `$.item[${order}]`,
    message: `Item "${item.name}" has no request or nested items`,
    severity: "warning"
  });
  return {
    type: "folder",
    folder: {
      name: item.name || "Empty Folder",
      description: extractDescription(item.description),
      subfolders: [],
      requests: [],
      order
    }
  };
}
function parsePostmanRequest(item, order, warnings) {
  const request = item.request;
  const url = parsePostmanUrl(request.url);
  let method = (request.method || "GET").toUpperCase();
  if (!VALID_HTTP_METHODS.includes(method)) {
    warnings.push({
      path: `$.request.method`,
      message: `Invalid HTTP method "${request.method}", defaulting to GET`,
      severity: "warning"
    });
    method = "GET";
  }
  const headers = {};
  if (Array.isArray(request.header)) {
    for (const header of request.header) {
      if (header.key && !header.disabled) {
        headers[header.key] = header.value || "";
      }
    }
  }
  const body = parsePostmanBody(request.body);
  const auth = item.auth ? parsePostmanAuth(item.auth) : request.auth ? parsePostmanAuth(request.auth) : null;
  const description = extractDescription(item.description) || extractDescription(request.description);
  return {
    name: item.name || "Unnamed Request",
    description,
    method,
    url,
    headers,
    body,
    auth,
    order
  };
}
function parsePostmanUrl(url) {
  if (!url) return "";
  if (typeof url === "string") {
    return url;
  }
  if (url.raw) {
    return url.raw;
  }
  let constructedUrl = "";
  if (url.protocol) {
    constructedUrl += url.protocol + "://";
  }
  if (url.host) {
    constructedUrl += Array.isArray(url.host) ? url.host.join(".") : url.host;
  }
  if (url.port) {
    constructedUrl += ":" + url.port;
  }
  if (url.path) {
    const pathString = Array.isArray(url.path) ? url.path.join("/") : url.path;
    constructedUrl += "/" + pathString;
  }
  if (url.query && url.query.length > 0) {
    const queryParams = url.query.filter((q) => !q.disabled && q.key).map((q) => `${encodeURIComponent(q.key)}=${encodeURIComponent(q.value || "")}`).join("&");
    if (queryParams) {
      constructedUrl += "?" + queryParams;
    }
  }
  if (url.hash) {
    constructedUrl += "#" + url.hash;
  }
  return constructedUrl || "";
}
function parsePostmanBody(body) {
  if (!body || body.mode === "none") {
    return null;
  }
  switch (body.mode) {
    case "raw":
      if (body.raw) {
        try {
          return JSON.parse(body.raw);
        } catch (e) {
          return body.raw;
        }
      }
      return null;
    case "urlencoded":
      if (body.urlencoded && Array.isArray(body.urlencoded)) {
        const params = {};
        for (const param of body.urlencoded) {
          if (param.key && !param.disabled) {
            params[param.key] = param.value || "";
          }
        }
        return params;
      }
      return null;
    case "formdata":
      if (body.formdata && Array.isArray(body.formdata)) {
        const formData = {};
        for (const param of body.formdata) {
          if (param.key && !param.disabled && param.type !== "file") {
            formData[param.key] = param.value || "";
          }
        }
        return formData;
      }
      return null;
    case "graphql":
      if (body.graphql) {
        return {
          query: body.graphql.query || "",
          variables: body.graphql.variables ? JSON.parse(body.graphql.variables) : void 0
        };
      }
      return null;
    default:
      return null;
  }
}
function parsePostmanAuth(auth) {
  if (!auth || auth.type === "noauth") {
    return { type: "none" };
  }
  const getAuthValue = (params, key) => {
    if (!params) return "";
    const param = params.find((p) => p.key === key);
    return (param == null ? void 0 : param.value) || "";
  };
  switch (auth.type) {
    case "basic":
      return {
        type: "basic",
        credentials: {
          username: getAuthValue(auth.basic, "username"),
          password: getAuthValue(auth.basic, "password")
        }
      };
    case "bearer":
      return {
        type: "bearer",
        credentials: {
          token: getAuthValue(auth.bearer, "token")
        }
      };
    case "apikey":
      return {
        type: "api-key",
        credentials: {
          key: getAuthValue(auth.apikey, "key"),
          value: getAuthValue(auth.apikey, "value"),
          in: getAuthValue(auth.apikey, "in") || "header"
        }
      };
    case "oauth2":
      return {
        type: "oauth2",
        credentials: {
          accessToken: getAuthValue(auth.oauth2, "accessToken"),
          tokenType: getAuthValue(auth.oauth2, "tokenType") || "Bearer",
          addTokenTo: getAuthValue(auth.oauth2, "addTokenTo") || "header"
        }
      };
    default:
      return { type: "none" };
  }
}
function extractDescription(description) {
  if (!description) return void 0;
  if (typeof description === "string") {
    return description;
  }
  return description.content || void 0;
}
function isPostmanCollection(data) {
  if (!data || typeof data !== "object") return false;
  const obj = data;
  if (!obj.info || typeof obj.info !== "object") return false;
  const info = obj.info;
  if (!info.schema || typeof info.schema !== "string") return false;
  return info.schema.includes("getpostman.com") || info.schema.includes("postman");
}
function isPostmanEnvironment(data) {
  var _a;
  if (!data || typeof data !== "object") return false;
  const obj = data;
  if (!obj.name || typeof obj.name !== "string") return false;
  if (!obj.values || !Array.isArray(obj.values)) return false;
  return obj._postman_variable_scope === "environment" || obj.values.length > 0 && typeof ((_a = obj.values[0]) == null ? void 0 : _a.key) === "string";
}

const FETCH_TIMEOUT = 3e4;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const postman_post = defineEventHandler(async (event) => {
  try {
    const contentType = getHeader(event, "content-type") || "";
    let projectId;
    let name;
    let source;
    let collectionContent;
    let environmentsContent;
    let importEnvironments = true;
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
      let envFileContent = null;
      for (const part of formData) {
        if (part.name === "file" && part.data) {
          fileContent = part.data.toString("utf-8");
          fileName = part.filename || null;
        } else if (part.name === "environments" && part.data) {
          envFileContent = part.data.toString("utf-8");
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
      name = fields.name || (fileName == null ? void 0 : fileName.replace(/\.json$/i, "")) || void 0;
      source = "file";
      collectionContent = fileContent;
      environmentsContent = envFileContent || fields.environments;
      importEnvironments = fields.importEnvironments !== "false";
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
      importEnvironments = body.importEnvironments !== false;
      environmentsContent = body.environments;
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
        try {
          const url = new URL(body.url);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Invalid protocol");
          }
        } catch (e) {
          return {
            success: false,
            error: {
              message: "Invalid URL format. URL must start with http:// or https://",
              code: "INVALID_URL"
            }
          };
        }
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
          const response = await fetch(body.url, {
            signal: controller.signal,
            headers: {
              "Accept": "application/json, */*",
              "User-Agent": "MockService-Postman-Importer/1.0"
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
          if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
            return {
              success: false,
              error: {
                message: `Collection file is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
                code: "FILE_TOO_LARGE"
              }
            };
          }
          collectionContent = await response.text();
          if (!collectionContent || collectionContent.trim().length === 0) {
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
        if (body.content.length > MAX_FILE_SIZE) {
          return {
            success: false,
            error: {
              message: `Collection content is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
              code: "CONTENT_TOO_LARGE"
            }
          };
        }
        collectionContent = body.content;
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
    let parsedCollectionObject;
    try {
      parsedCollectionObject = JSON.parse(collectionContent);
    } catch (parseError) {
      return {
        success: false,
        error: {
          message: `Failed to parse collection JSON: ${parseError.message}`,
          code: "PARSE_ERROR",
          details: [{
            path: "$",
            message: parseError.message
          }]
        }
      };
    }
    if (!isPostmanCollection(parsedCollectionObject)) {
      return {
        success: false,
        error: {
          message: "Invalid Postman collection format. The file does not appear to be a valid Postman Collection v2.x",
          code: "INVALID_FORMAT"
        }
      };
    }
    const parseResult = parsePostmanCollection(parsedCollectionObject);
    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: {
          message: "Invalid Postman collection",
          code: "VALIDATION_ERROR",
          details: parseResult.errors.map((e) => ({
            path: e.path,
            message: e.message
          }))
        }
      };
    }
    const parsedCollection = parseResult.data;
    const collectionName = name || parsedCollection.name || "Imported Collection";
    const newCollection = db.insert(collections).values({
      projectId,
      name: collectionName,
      description: parsedCollection.description || null,
      authConfig: parsedCollection.auth ? { auth: parsedCollection.auth } : null
    }).returning().get();
    const createdFolders = [];
    const createdRequests = [];
    const createdEnvironments = [];
    let totalVariablesCreated = 0;
    const createFoldersRecursively = (parsedFolders, parentFolderId = null) => {
      for (const parsedFolder of parsedFolders) {
        const newFolder = db.insert(folders).values({
          collectionId: newCollection.id,
          parentFolderId,
          name: parsedFolder.name,
          order: parsedFolder.order
        }).returning().get();
        createdFolders.push({
          id: newFolder.id,
          name: newFolder.name,
          parentFolderId: newFolder.parentFolderId
        });
        for (const parsedRequest of parsedFolder.requests) {
          const newRequest = db.insert(savedRequests).values({
            folderId: newFolder.id,
            name: parsedRequest.name,
            method: parsedRequest.method,
            url: parsedRequest.url,
            headers: Object.keys(parsedRequest.headers).length > 0 ? parsedRequest.headers : null,
            body: parsedRequest.body,
            auth: parsedRequest.auth,
            order: parsedRequest.order
          }).returning().get();
          createdRequests.push({
            id: newRequest.id,
            name: newRequest.name,
            method: newRequest.method,
            url: newRequest.url,
            folderId: newRequest.folderId
          });
        }
        if (parsedFolder.subfolders.length > 0) {
          createFoldersRecursively(parsedFolder.subfolders, newFolder.id);
        }
      }
    };
    if (parsedCollection.requests.length > 0) {
      const defaultFolder = db.insert(folders).values({
        collectionId: newCollection.id,
        parentFolderId: null,
        name: "Requests",
        order: 0
      }).returning().get();
      createdFolders.push({
        id: defaultFolder.id,
        name: defaultFolder.name,
        parentFolderId: null
      });
      for (const parsedRequest of parsedCollection.requests) {
        const newRequest = db.insert(savedRequests).values({
          folderId: defaultFolder.id,
          name: parsedRequest.name,
          method: parsedRequest.method,
          url: parsedRequest.url,
          headers: Object.keys(parsedRequest.headers).length > 0 ? parsedRequest.headers : null,
          body: parsedRequest.body,
          auth: parsedRequest.auth,
          order: parsedRequest.order
        }).returning().get();
        createdRequests.push({
          id: newRequest.id,
          name: newRequest.name,
          method: newRequest.method,
          url: newRequest.url,
          folderId: newRequest.folderId
        });
      }
    }
    createFoldersRecursively(parsedCollection.folders);
    if (importEnvironments) {
      if (parsedCollection.variables.length > 0) {
        const collectionEnv = db.insert(environments).values({
          projectId,
          name: `${collectionName} Variables`,
          isActive: false
        }).returning().get();
        for (const variable of parsedCollection.variables) {
          db.insert(environmentVariables).values({
            environmentId: collectionEnv.id,
            key: variable.key,
            value: variable.value,
            isSecret: variable.isSecret
          }).run();
          totalVariablesCreated++;
        }
        createdEnvironments.push({
          id: collectionEnv.id,
          name: collectionEnv.name,
          variableCount: parsedCollection.variables.length
        });
      }
      if (environmentsContent) {
        try {
          const envData = JSON.parse(environmentsContent);
          const envsToProcess = Array.isArray(envData) ? envData : [envData];
          for (const envItem of envsToProcess) {
            if (isPostmanEnvironment(envItem)) {
              const envResult = parsePostmanEnvironment(envItem);
              if (envResult.success && envResult.data) {
                const newEnv = db.insert(environments).values({
                  projectId,
                  name: envResult.data.name,
                  isActive: false
                }).returning().get();
                for (const variable of envResult.data.variables) {
                  db.insert(environmentVariables).values({
                    environmentId: newEnv.id,
                    key: variable.key,
                    value: variable.value,
                    isSecret: variable.isSecret
                  }).run();
                  totalVariablesCreated++;
                }
                createdEnvironments.push({
                  id: newEnv.id,
                  name: newEnv.name,
                  variableCount: envResult.data.variables.length
                });
              }
            }
          }
        } catch (e) {
          parseResult.warnings.push({
            path: "$.environments",
            message: "Failed to parse environments data",
            severity: "warning"
          });
        }
      }
    }
    return {
      success: true,
      collection: {
        id: newCollection.id,
        projectId: newCollection.projectId,
        name: newCollection.name,
        description: newCollection.description,
        createdAt: newCollection.createdAt
      },
      stats: {
        foldersCreated: createdFolders.length,
        requestsCreated: createdRequests.length,
        environmentsCreated: createdEnvironments.length,
        variablesCreated: totalVariablesCreated
      },
      folders: createdFolders,
      requests: createdRequests,
      environments: createdEnvironments,
      warnings: parseResult.warnings.map((w) => ({
        path: w.path,
        message: w.message
      }))
    };
  } catch (error) {
    console.error("Error importing Postman collection:", error);
    return {
      success: false,
      error: {
        message: "An unexpected error occurred while importing the collection",
        code: "INTERNAL_ERROR",
        details: [{
          path: "$",
          message: error.message || "Unknown error"
        }]
      }
    };
  }
});

export { postman_post as default };
//# sourceMappingURL=postman.post.mjs.map
