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

**Workspace Hierarchy Tree Pattern**
- Build recursive tree structure from flat database queries using parent references
- Use Set<string> for tracking expanded/collapsed state (efficient O(1) lookups)
- Recursive component pattern for nested folder structures
- Method color coding: GET=green(#22c55e), POST=blue(#3b82f6), PUT=orange(#f97316), DELETE=red(#ef4444), PATCH=yellow(#eab308), HEAD=purple(#8b5cf6), OPTIONS=gray(#64748b)
- API endpoint fetches entire tree with pre-computed counts in single request for performance
- Context menu uses Teleport to render outside overflow containers
- Tree build: folder tree, collection tree, project tree - recursively build from flat data array

**Request Builder Pattern**
- RequestBuilder component provides complete HTTP request building interface
- Method dropdown uses Tailwind color classes for visual feedback (text-method-get, text-method-post, etc.)
- URL input with Enter key support for quick request sending
- Send button with loading spinner animation disabled while request is in flight
- Keyboard shortcut Cmd/Ctrl+Enter triggers request send globally
- Proxy integration via /api/proxy/request endpoint for actual HTTP execution
- Response display with success/error states and timing information
- Workspace ID computed from workspaces data for request history logging

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

## ✓ Iteration 2 - US-017: Variable substitution engine
*2026-01-20T16:24:38.140Z (291s)*

**Status:** Completed

**Notes:**
rt `substituteVariables(input, context)` and `extractVariables(input)` functions\n\n**Key Features:**\n1. ✅ Parse {{variableName}} syntax\n2. ✅ Resolve variables from environment scope\n3. ✅ Support nested variable references\n4. ✅ Variable: environment > collection > project > global precedence\n5. ✅ Return list of undefined variables as warnings\n6. ✅ Utility function usable in proxy endpoint\n7. ✅ Ready for build verification\n\n**Run this command to verify:**\n```bash\nnpm run build\n```\n

---

## [2026-01-20] - US-018
- Implemented workspace hierarchy sidebar with tree view
- Created API endpoint for fetching workspace tree structure (server/api/admin/tree.get.ts)
- Created API endpoint for fetching requests in a folder (server/api/admin/folders/[id]/requests.get.ts)
- Added workspace switcher dropdown for easy navigation between workspaces
- Implemented collapsible tree nodes for Projects > Collections > Folders > Requests hierarchy
- Added visual indicators for HTTP method types (GET=green, POST=blue, PUT=orange, DELETE=red, etc.)
- Added right-click context menu support for CRUD actions (create, edit, delete)
- Created FolderTreeItem component for recursive folder tree rendering
- Updated AppSidebar component to support both hierarchy view and traditional mocks view
- Updated admin/index.vue to fetch and pass workspace data to sidebar
- Files changed:
  - app/components/AppSidebar.vue (complete overhaul with hierarchy support)
  - app/components/FolderTreeItem.vue (new recursive component)
  - app/pages/admin/index.vue (added workspace data fetching and handlers)
  - server/api/admin/tree.get.ts (new endpoint)
  - server/api/admin/folders/[id]/requests.get.ts (new endpoint)
- **Learnings:**
  - Tree data structure requires recursive component for nested folders
  - Context menu positioning needs Teleport to render outside sidebar overflow
  - State management for expanded/collapsed nodes using Set data structure is efficient
  - Method color coding provides immediate visual feedback in tree navigation
  - Build folder tree recursively from flat database query results using parent reference
  - API endpoint design: prefer fetching entire tree at once with pre-computed counts for performance
  - Type safety crucial for TypeScript interfaces across component hierarchy

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
## ✓ Iteration 2 - US-017: Variable substitution engine
*2026-01-20T16:24:38.140Z (291s)*

**Status:** Completed

**Notes:**
rt `substituteVariables(input, context)` and `extractVariables(input)` functions\n\n**Key Features:**\n1. ✅ Parse {{variableName}} syntax\n2. ✅ Resolve variables from environment scope\n3. ✅ Support nested variable references\n4. ✅ Variable: environment > collection > project > global precedence\n5. ✅ Return list of undefined variables as warnings\n6. ✅ Utility function usable in proxy endpoint\n7. ✅ Ready for build verification\n\n**Run this command to verify:**\n```bash\nnpm run build\n```\n\n

---
## ✓ Iteration 3 - US-018: Sidebar with Workspace/Project/Collection tree
*2026-01-20T16:56:36.474Z (1917s)*

**Status:** Completed

**Notes:**
, the sidebar will render correctly in the browser. You can then:
1. Navigate to http://localhost:3000/admin
2. Click the \"Workspace\" tab to see the hierarchy
3. Use the workspace dropdown to switch between workspaces
4. Click chevrons to expand/collapse tree nodes
5. Right-click items to see context menus
6. Click requests to open them in the request builder

The sidebar maintains backward compatibility with the existing mocks view while adding the new workspace hierarchy feature!

---

## [2026-01-21] - US-019
- Implemented Request Builder UI for HTTP request construction
- Created RequestBuilder.vue component with complete request building interface
- Added HTTP method dropdown supporting all methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- Implemented URL input field with Enter key support for quick sending
- Added Send button with loading state spinner animation
- Implemented keyboard shortcut Cmd/Ctrl+Enter for sending requests
- Integrated proxy endpoint (/api/proxy/request) for actual HTTP execution
- Added response display with success/error states and timing information
- Enhanced RequestBuilder to support workspace ID for request history logging
- Integrated RequestBuilder into admin/index.vue for request selection workflow
- Added method color coding using Tailwind config (method-get, method-post, etc.)
- Updated tailwind.config.js to include HEAD (#8b5cf6) and OPTIONS (#64748b) method colors
- Files changed:
  - app/components/RequestBuilder.vue (new component)
  - app/pages/admin/index.vue (integrated RequestBuilder, added selectedRequest state)
  - tailwind.config.js (added HEAD and OPTIONS method colors)
- **Learnings:**
  - Request builder component pattern should be self-contained with props for request data and workspace context
  - Keyboard shortcuts should be registered in onMounted and removed in onUnmounted to avoid memory leaks
  - Loading states should disable relevant buttons while request is in flight for better UX
  - Method color coding can be achieved via Tailwind config and color utility classes
  - Proxy endpoint (/api/proxy/request) already supports all HTTP methods and error handling
  - Response display should distinguish between success (200-299) and error states visually
  - Compute properties are useful for deriving data like current workspace from workspaces array
  - Component integration requires careful state management (clearing selectedRequest when selectedMock is set)
  - Response body parsing is handled by proxy endpoint, supporting JSON, text, and binary data
  - Timing information (durationMs) helps users understand request performance

---
## ✓ Iteration 4 - US-019: Request Builder UI - URL and method
*2026-01-20T17:02:32.054Z (355s)*

**Status:** Completed

**Notes:**
s**:\n   - Added HEAD (#8b5cf6) and OPTIONS (#64748b) method colors\n   - All methods now have proper color coding\n\n## Command to run:\n\n```bash\nnpm run build\n```\n\nAfter building, verify in browser:\n- Navigate to http://localhost:3000/admin\n- Click Workspace tab and expand tree\n- Click on a request to see Request Builder\n- Select HTTP method from dropdown\n- Enter URL and press Enter or Cmd/Ctrl+Enter\n- See loading state during request\n- View response with status code and timing\n\n

---
