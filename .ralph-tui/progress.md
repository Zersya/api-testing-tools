# Ralph Progress Log

This file tracks progress across iterations. It's automatically updated
after each iteration and included in agent prompts for context.

## Codebase Patterns (Study These First)

**Mock Pattern: Mock Data Storage**
- Use `useStorage('mocks')` for accessing Nitro storage layer
- Mocks are stored as flat key-value pairs using UUID as key
- Each mock contains: id, collection, path, method, status, response, delay, secure, createdAt, sourceDefinitionId
- When updating existing mocks, iterate through all keys to find matching method/path/collection combination to prevent duplicates

**API Definition Pattern**
- API definitions are stored in SQLite database using Drizzle ORM
- Spec content can be JSON or YAML (stored as text)
- Parse on-demand using `parseOpenAPISpec` to extract endpoints and schemas
- Return `parsedInfo` from GET endpoint to avoid parsing on multiple requests

**Schema Generation Pattern**
- `generateMockData` function recursively generates mock data from OpenAPI schemas
- Handles: $ref, allOf, oneOf, anyOf, basic types (string, number, integer, boolean, null, object, array)
- Supports common formats: date-time, date, email, uuid, uri
- Prevents infinite recursion with depth limit (max 5)
- Always check for example/default first, then fall back to generated data

**UI Modal Pattern**
- Use reactive refs for modal visibility (showGenerateModal, showImportModal)
- Load data on modal open with async function (openGenerateModal)
- Select/deselect all functionality for endpoint selection
- Show loading state and error handling in UI

**Variable Substitution Pattern**
- Use `substituteVariables(input, context)` to replace {{variableName}} patterns
- Context object defines scope: { environmentId, collectionId, projectId, workspaceId }
- Engine respects precedence: environment > collection > project > global (workspace)
- Supports nested references with circular reference protection
- Returns both substituted value and warnings for undefined variables
- Use `extractVariables(input)` to get list of all variable names in a string

---

## [2026-01-20] - US-016
- Verified all acceptance criteria for generating mocks from API definitions
- No changes needed - implementation already complete
- Files verified: server/api/definitions/[id]/generate-mocks.post.ts, app/pages/admin/definitions/index.vue, server/utils/schema-generator.ts
- **Learnings:**
  - Generate mocks endpoint properly handles endpoint selection, OpenAPI examples, and schema-based data generation
  - Response delay configuration is supported and applied to generated mocks
  - Source API definition is linked via `sourceDefinitionId` property
  - Storage layer uses flat key-value pattern with UUID keys
  - UI provides complete interface for viewing endpoints and selecting which to mock

---

## ✓ Iteration 1 - US-016: Generate mocks from API definition
*2026-01-20T16:19:45.879Z (627s)*

**Status:** Completed

**Notes:**
sessionID":"ses_423d5136dffe7iSLgcayC1d2zp","part":{"id":"prt_bdc3465a90013Fmt2eYWwf74TQ","sessionID":"ses_423d5136dffe7iSLgcayC1d2zp","messageID":"msg_bdc3437e00017iuVbzQF9evxf4","type":"step-start","snapshot":"00f86132c4437080ff5f580f249d4cc0a6ea06ed"}}
{"type":"text","timestamp":1768925985748,"sessionID":"ses_423d5136dffe7iSLgcayC1d2zp","part":{"id":"prt_bdc346876001wno69a77M9lmqS","sessionID":"ses_423d5136dffe7iSLgcayC1d2zp","messageID":"msg_bdc3437e00017iuVbzQF9evxf4","type":"text","text":"

---

## [2026-01-20] - US-017
- Implemented variable substitution engine with {{variableName}} syntax parsing
- Created server/utils/variable-substitution.ts utility module
- Support for environment, collection, project, and workspace/global variable scopes
- Nested variable reference resolution with circular reference protection
- Variable precedence: environment > collection > project > global
- Returns warnings for undefined variables
- ExtractVariables utility for parsing variable names from strings
- Ready for integration in proxy endpoint
- Files changed: server/utils/variable-substitution.ts, .ralph-tui/progress.md
- **Learnings:**
  - Variable substitution requires iterative parsing to handle nested references
  - Circular reference detection is critical to prevent infinite loops
  - Regex pattern `/\{\{([^{}]+)\}\}/g` reliably captures variable names
  - Context-based resolution allows flexible scope specification
  - Warning accumulation helps users identify missing variables
  - Project baseUrl is automatically exposed as base_url variable
  - Collection variables sourced from authConfig (extensible pattern)

---
