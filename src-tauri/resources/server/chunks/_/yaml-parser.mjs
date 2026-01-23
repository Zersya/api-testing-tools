const SUPPORTED_VERSIONS = ["3.0", "3.1"];
function parseOpenAPISpec(spec) {
  var _a, _b;
  const errors = [];
  const warnings = [];
  if (!spec || typeof spec !== "object") {
    errors.push({
      path: "$",
      message: "Specification must be a valid object",
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const specObj = spec;
  const openApiVersion = specObj.openapi;
  if (!openApiVersion) {
    errors.push({
      path: "$.openapi",
      message: 'Missing required field "openapi". This must be a valid OpenAPI 3.x specification.',
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const versionMatch = openApiVersion.match(/^(\d+\.\d+)/);
  if (!versionMatch) {
    errors.push({
      path: "$.openapi",
      message: `Invalid OpenAPI version format: "${openApiVersion}"`,
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const majorMinorVersion = versionMatch[1];
  if (!SUPPORTED_VERSIONS.some((v) => majorMinorVersion.startsWith(v))) {
    errors.push({
      path: "$.openapi",
      message: `Unsupported OpenAPI version: "${openApiVersion}". Supported versions: 3.0.x, 3.1.x`,
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  const info = specObj.info;
  if (!info || typeof info !== "object") {
    errors.push({
      path: "$.info",
      message: 'Missing required field "info"',
      severity: "error"
    });
    return { success: false, errors, warnings };
  }
  if (!info.title || typeof info.title !== "string") {
    errors.push({
      path: "$.info.title",
      message: 'Missing required field "info.title"',
      severity: "error"
    });
  }
  if (!info.version || typeof info.version !== "string") {
    errors.push({
      path: "$.info.version",
      message: 'Missing required field "info.version"',
      severity: "error"
    });
  }
  if (errors.length > 0) {
    return { success: false, errors, warnings, rawSpec: spec };
  }
  const endpoints = [];
  const paths = specObj.paths;
  if (paths && typeof paths === "object") {
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") {
        warnings.push({
          path: `$.paths["${path}"]`,
          message: "Path item is not a valid object",
          severity: "warning"
        });
        continue;
      }
      const httpMethods = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];
      for (const method of httpMethods) {
        const operation = pathItem[method];
        if (!operation || typeof operation !== "object") continue;
        const endpoint = {
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags,
          parameters: extractParameters(operation.parameters, pathItem.parameters),
          requestBody: operation.requestBody,
          responses: operation.responses,
          security: operation.security
        };
        if (endpoint.operationId) {
          const duplicateOp = endpoints.find((e) => e.operationId === endpoint.operationId);
          if (duplicateOp) {
            warnings.push({
              path: `$.paths["${path}"].${method}.operationId`,
              message: `Duplicate operationId "${endpoint.operationId}" found`,
              severity: "warning"
            });
          }
        }
        const pathParams = ((_a = path.match(/\{([^}]+)\}/g)) == null ? void 0 : _a.map((p) => p.slice(1, -1))) || [];
        for (const paramName of pathParams) {
          const paramDefined = (_b = endpoint.parameters) == null ? void 0 : _b.some(
            (p) => p.name === paramName && p.in === "path"
          );
          if (!paramDefined) {
            warnings.push({
              path: `$.paths["${path}"].${method}`,
              message: `Path parameter "{${paramName}}" is not defined in parameters`,
              severity: "warning"
            });
          }
        }
        endpoints.push(endpoint);
      }
    }
  } else {
    warnings.push({
      path: "$.paths",
      message: "No paths defined in the specification",
      severity: "warning"
    });
  }
  const schemas = {};
  const components = specObj.components;
  if (components && typeof components === "object") {
    const componentSchemas = components.schemas;
    if (componentSchemas && typeof componentSchemas === "object") {
      for (const [name, schema] of Object.entries(componentSchemas)) {
        if (schema && typeof schema === "object") {
          schemas[name] = resolveSchemaRef(specObj, schema);
        }
      }
    }
  }
  const definitions = specObj.definitions;
  if (definitions && typeof definitions === "object") {
    for (const [name, schema] of Object.entries(definitions)) {
      if (schema && typeof schema === "object" && !schemas[name]) {
        schemas[name] = resolveSchemaRef(specObj, schema);
      }
    }
  }
  if (Object.keys(schemas).length === 0) {
    const paths2 = specObj.paths;
    if (paths2 && typeof paths2 === "object") {
      for (const pathItem of Object.values(paths2)) {
        if (pathItem && typeof pathItem === "object") {
          for (const operation of Object.values(pathItem)) {
            if (operation && typeof operation === "object") {
              const responses = operation.responses;
              if (responses) {
                for (const response of Object.values(responses)) {
                  if (response && typeof response === "object") {
                    const content = response.content;
                    if (content) {
                      for (const mediaType of Object.values(content)) {
                        if (mediaType && typeof mediaType === "object") {
                          const schema = mediaType.schema;
                          if (schema && typeof schema === "object" && !schema.$ref) ;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  function resolveSchemaRef(spec2, schema) {
    if (schema.$ref && typeof schema.$ref === "string") {
      const refPath = schema.$ref.split("/").pop();
      if (refPath) {
        if (components && typeof components === "object") {
          const refSchemas = components.schemas;
          if (refSchemas && typeof refSchemas === "object" && refSchemas[refPath]) {
            return resolveSchemaRef(spec2, refSchemas[refPath]);
          }
        }
        if (definitions && typeof definitions === "object") {
          if (definitions[refPath]) {
            return resolveSchemaRef(spec2, definitions[refPath]);
          }
        }
      }
    }
    if (schema.allOf) {
      schema.allOf = schema.allOf.map((s) => resolveSchemaRef(spec2, s));
    }
    if (schema.oneOf) {
      schema.oneOf = schema.oneOf.map((s) => resolveSchemaRef(spec2, s));
    }
    if (schema.anyOf) {
      schema.anyOf = schema.anyOf.map((s) => resolveSchemaRef(spec2, s));
    }
    if (schema.items) {
      schema.items = resolveSchemaRef(spec2, schema.items);
    }
    if (schema.properties) {
      for (const key of Object.keys(schema.properties)) {
        if (schema.properties && schema.properties[key]) {
          schema.properties[key] = resolveSchemaRef(spec2, schema.properties[key]);
        }
      }
    }
    return schema;
  }
  const securitySchemes = components == null ? void 0 : components.securitySchemes;
  const tags = specObj.tags;
  const servers = specObj.servers;
  const parsedSpec = {
    info: {
      title: info.title,
      version: info.version,
      description: info.description,
      termsOfService: info.termsOfService,
      contact: info.contact,
      license: info.license
    },
    openApiVersion,
    servers,
    endpoints,
    schemas,
    securitySchemes,
    tags
  };
  return {
    success: true,
    data: parsedSpec,
    errors,
    warnings,
    rawSpec: spec
  };
}
function extractParameters(operationParams, pathItemParams) {
  const params = [];
  const seenParams = /* @__PURE__ */ new Set();
  if (Array.isArray(operationParams)) {
    for (const param of operationParams) {
      if (param && typeof param === "object") {
        const p = param;
        const key = `${p.in}:${p.name}`;
        if (!seenParams.has(key)) {
          seenParams.add(key);
          params.push(p);
        }
      }
    }
  }
  if (Array.isArray(pathItemParams)) {
    for (const param of pathItemParams) {
      if (param && typeof param === "object") {
        const p = param;
        const key = `${p.in}:${p.name}`;
        if (!seenParams.has(key)) {
          seenParams.add(key);
          params.push(p);
        }
      }
    }
  }
  return params;
}
function detectSpecFormat(content) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch (e) {
    }
  }
  if (trimmed.startsWith("openapi:") || trimmed.startsWith("---") || trimmed.includes("\nopenapi:") || /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:/m.test(trimmed)) {
    return "yaml";
  }
  return "unknown";
}
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

function parseYAML(yamlString) {
  const lines = yamlString.split("\n");
  const cleanedLines = [];
  for (const line of lines) {
    if (line.trim() === "---" || line.trim() === "...") {
      continue;
    }
    const commentIndex = findCommentIndex(line);
    const cleanLine = commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    cleanedLines.push(cleanLine);
  }
  const context = {
    lines: cleanedLines,
    currentIndex: 0};
  return parseValue(context);
}
function findCommentIndex(line) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const prevChar = i > 0 ? line[i - 1] : "";
    if (char === "'" && !inDoubleQuote && prevChar !== "\\") {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== "\\") {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "#" && !inSingleQuote && !inDoubleQuote) {
      if (i === 0 || /\s/.test(prevChar)) {
        return i;
      }
    }
  }
  return -1;
}
function getIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}
function parseValue(context) {
  skipEmptyLines(context);
  if (context.currentIndex >= context.lines.length) {
    return null;
  }
  const line = context.lines[context.currentIndex];
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("- ") || trimmed === "-") {
    return parseArray(context);
  }
  if (trimmed.includes(":")) {
    return parseObject(context);
  }
  context.currentIndex++;
  return parseScalar(trimmed);
}
function parseObject(context) {
  const result = {};
  const startIndent = getIndent(context.lines[context.currentIndex]);
  while (context.currentIndex < context.lines.length) {
    skipEmptyLines(context);
    if (context.currentIndex >= context.lines.length) {
      break;
    }
    const line = context.lines[context.currentIndex];
    const currentIndent = getIndent(line);
    const trimmed = line.trim();
    if (!trimmed) {
      context.currentIndex++;
      continue;
    }
    if (currentIndent < startIndent) {
      break;
    }
    if (currentIndent > startIndent && Object.keys(result).length > 0) {
      break;
    }
    const colonIndex = findColonIndex(trimmed);
    if (colonIndex === -1) {
      context.currentIndex++;
      continue;
    }
    const key = trimmed.substring(0, colonIndex).trim();
    const valueAfterColon = trimmed.substring(colonIndex + 1).trim();
    context.currentIndex++;
    if (valueAfterColon) {
      if (valueAfterColon.startsWith("[")) {
        result[key] = parseInlineArray(valueAfterColon);
      } else if (valueAfterColon.startsWith("{")) {
        result[key] = parseInlineObject(valueAfterColon);
      } else if (valueAfterColon === "|" || valueAfterColon === ">") {
        result[key] = parseMultilineString(context, currentIndent, valueAfterColon === "|");
      } else {
        result[key] = parseScalar(valueAfterColon);
      }
    } else {
      skipEmptyLines(context);
      if (context.currentIndex >= context.lines.length) {
        result[key] = null;
        continue;
      }
      const nextLine = context.lines[context.currentIndex];
      const nextIndent = getIndent(nextLine);
      const nextTrimmed = nextLine.trim();
      if (!nextTrimmed || nextIndent <= currentIndent) {
        result[key] = null;
      } else if (nextTrimmed.startsWith("- ") || nextTrimmed === "-") {
        result[key] = parseArray(context);
      } else {
        result[key] = parseObject(context);
      }
    }
  }
  return result;
}
function findColonIndex(str) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";
    if (char === "'" && !inDoubleQuote && prevChar !== "\\") {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== "\\") {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ":" && !inSingleQuote && !inDoubleQuote) {
      if (i === str.length - 1 || /[\s]/.test(str[i + 1])) {
        return i;
      }
    }
  }
  return -1;
}
function parseArray(context) {
  const result = [];
  const startIndent = getIndent(context.lines[context.currentIndex]);
  while (context.currentIndex < context.lines.length) {
    skipEmptyLines(context);
    if (context.currentIndex >= context.lines.length) {
      break;
    }
    const line = context.lines[context.currentIndex];
    const currentIndent = getIndent(line);
    const trimmed = line.trim();
    if (!trimmed) {
      context.currentIndex++;
      continue;
    }
    if (currentIndent < startIndent) {
      break;
    }
    if (currentIndent !== startIndent) {
      break;
    }
    if (!trimmed.startsWith("-")) {
      break;
    }
    const afterDash = trimmed.substring(1).trim();
    context.currentIndex++;
    if (!afterDash) {
      skipEmptyLines(context);
      if (context.currentIndex < context.lines.length) {
        const nextIndent = getIndent(context.lines[context.currentIndex]);
        if (nextIndent > currentIndent) {
          result.push(parseValue(context));
        } else {
          result.push(null);
        }
      } else {
        result.push(null);
      }
    } else if (afterDash.includes(":") && !afterDash.startsWith("{")) {
      const colonIdx = findColonIndex(afterDash);
      if (colonIdx !== -1) {
        const key = afterDash.substring(0, colonIdx).trim();
        const val = afterDash.substring(colonIdx + 1).trim();
        const obj = {};
        obj[key] = val ? parseScalar(val) : null;
        skipEmptyLines(context);
        if (context.currentIndex < context.lines.length) {
          const nextLine = context.lines[context.currentIndex];
          const nextIndent = getIndent(nextLine);
          const itemIndent = currentIndent + 2;
          if (nextIndent >= itemIndent && nextLine.trim().includes(":")) {
            const nested = parseObject(context);
            Object.assign(obj, nested);
          }
        }
        result.push(obj);
      } else {
        result.push(parseScalar(afterDash));
      }
    } else if (afterDash.startsWith("[")) {
      result.push(parseInlineArray(afterDash));
    } else if (afterDash.startsWith("{")) {
      result.push(parseInlineObject(afterDash));
    } else {
      result.push(parseScalar(afterDash));
    }
  }
  return result;
}
function parseInlineArray(str) {
  const trimmed = str.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return [];
  }
  const result = [];
  const items = splitByComma(content);
  for (const item of items) {
    const trimmedItem = item.trim();
    if (trimmedItem.startsWith("{")) {
      result.push(parseInlineObject(trimmedItem));
    } else if (trimmedItem.startsWith("[")) {
      result.push(parseInlineArray(trimmedItem));
    } else {
      result.push(parseScalar(trimmedItem));
    }
  }
  return result;
}
function parseInlineObject(str) {
  const trimmed = str.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return {};
  }
  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return {};
  }
  const result = {};
  const pairs = splitByComma(content);
  for (const pair of pairs) {
    const colonIndex = findColonIndex(pair);
    if (colonIndex !== -1) {
      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();
      if (value.startsWith("{")) {
        result[key] = parseInlineObject(value);
      } else if (value.startsWith("[")) {
        result[key] = parseInlineArray(value);
      } else {
        result[key] = parseScalar(value);
      }
    }
  }
  return result;
}
function splitByComma(str) {
  const result = [];
  let current = "";
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : "";
    if (char === "'" && !inDoubleQuote && prevChar !== "\\") {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== "\\") {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (char === "{" || char === "[") {
        depth++;
      } else if (char === "}" || char === "]") {
        depth--;
      } else if (char === "," && depth === 0) {
        result.push(current);
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current) {
    result.push(current);
  }
  return result;
}
function parseMultilineString(context, baseIndent, literal) {
  const lines = [];
  const contentIndent = baseIndent + 2;
  while (context.currentIndex < context.lines.length) {
    const line = context.lines[context.currentIndex];
    const currentIndent = getIndent(line);
    if (!line.trim()) {
      if (lines.length > 0) {
        lines.push("");
      }
      context.currentIndex++;
      continue;
    }
    if (currentIndent < contentIndent && line.trim()) {
      break;
    }
    lines.push(line.substring(contentIndent));
    context.currentIndex++;
  }
  while (lines.length > 0 && !lines[lines.length - 1]) {
    lines.pop();
  }
  if (literal) {
    return lines.join("\n");
  } else {
    return lines.join(" ").replace(/\s+/g, " ").trim();
  }
}
function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "~") {
    return null;
  }
  if (trimmed === "true" || trimmed === "True" || trimmed === "TRUE") {
    return true;
  }
  if (trimmed === "false" || trimmed === "False" || trimmed === "FALSE") {
    return false;
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') || trimmed.startsWith("'") && trimmed.endsWith("'")) {
    const unquoted = trimmed.slice(1, -1);
    if (trimmed.startsWith('"')) {
      return unquoted.replace(/\\n/g, "\n").replace(/\\t/g, "	").replace(/\\r/g, "\r").replace(/\\\\/g, "\\").replace(/\\"/g, '"');
    }
    return unquoted;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^-?\d*\.\d+$/.test(trimmed) || /^-?\d+\.\d*$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  if (/^-?\d+e[+-]?\d+$/i.test(trimmed)) {
    return parseFloat(trimmed);
  }
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  if (/^0o[0-7]+$/.test(trimmed)) {
    return parseInt(trimmed.substring(2), 8);
  }
  if (trimmed === ".inf" || trimmed === ".Inf" || trimmed === ".INF") {
    return Infinity;
  }
  if (trimmed === "-.inf" || trimmed === "-.Inf" || trimmed === "-.INF") {
    return -Infinity;
  }
  if (trimmed === ".nan" || trimmed === ".NaN" || trimmed === ".NAN") {
    return NaN;
  }
  return trimmed;
}
function skipEmptyLines(context) {
  while (context.currentIndex < context.lines.length) {
    const line = context.lines[context.currentIndex];
    if (line.trim()) {
      break;
    }
    context.currentIndex++;
  }
}

export { parseOpenAPISpec as a, detectSpecFormat as d, isValidUrl as i, parseYAML as p };
//# sourceMappingURL=yaml-parser.mjs.map
