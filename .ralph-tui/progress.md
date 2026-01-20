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

