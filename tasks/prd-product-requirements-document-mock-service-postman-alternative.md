# Product Requirements Document: Mock Service → Postman Alternative

## Overview

**Product Name:** MockAPI Studio (working title)  
**Version:** 2.0  
**Author:** AI Assistant  
**Date:** January 2025  
**Status:** Draft

### Executive Summary

Transform the existing mock-service application into a comprehensive Postman alternative with first-class OpenAPI support, Redocly-style API documentation, and enterprise-ready authentication. The application will serve as a self-hosted, local-first API development platform that can replace Postman for personal and team use.

### Problem Statement

- Postman has become increasingly cloud-dependent and subscription-heavy
- Teams need a self-hosted alternative for security-sensitive environments
- Existing mock services lack integrated API documentation and real request testing
- OpenAPI specs are underutilized—they should auto-generate both mocks AND documentation

### Goals

1. **Primary:** Create a full-featured Postman replacement with local-first architecture
2. **Secondary:** Provide beautiful, Redocly-style API documentation from OpenAPI specs
3. **Tertiary:** Maintain backward compatibility with existing mock service functionality

---

## User Stories

### Epic 1: OpenAPI Import & API Definitions

**US-1.1:** As a developer, I want to import an OpenAPI 3.x specification file so that I can auto-generate API definitions, mocks, and documentation.

**Acceptance Criteria:**
- Support OpenAPI 3.0 and 3.1 JSON/YAML formats
- Parse all endpoints, schemas, examples, and descriptions
- Store as an "API Definition" entity that can generate mocks on-demand
- Display import progress and validation errors
- Support import via file upload, URL fetch, or paste

**US-1.2:** As a developer, I want to import a Postman Collection (v2.1) so that I can migrate my existing workflows.

**Acceptance Criteria:**
- Parse Postman Collection v2.1 JSON format
- Import requests with headers, body, auth, and variables
- Map Postman folders to collection folders
- Import Postman environments as environment presets
- Preserve request descriptions and examples

**US-1.3:** As a developer, I want to generate mock endpoints from my API definition on-demand so that I can test against realistic responses.

**Acceptance Criteria:**
- One-click "Generate Mocks" from API definition
- Use OpenAPI examples or generate from schema
- Support response variations (success, error codes)
- Link mocks back to source API definition

---

### Epic 2: Workspace & Organization Hierarchy

**US-2.1:** As a user, I want to organize my work in Workspaces so that I can separate different projects or clients.

**Acceptance Criteria:**
- Create, rename, delete workspaces
- Switch between workspaces from sidebar
- Each workspace has isolated projects, collections, and environments
- Default "Personal" workspace on first launch

**US-2.2:** As a user, I want to create Projects within Workspaces so that I can group related APIs together.

**Acceptance Criteria:**
- Projects contain collections, API definitions, and environments
- Project-level settings (base URL, default headers)
- Project overview dashboard showing stats

**US-2.3:** As a user, I want to organize requests in Collections with nested Folders so that I can structure my API logically.

**Acceptance Criteria:**
- Create collections within projects
- Unlimited folder nesting within collections
- Drag-and-drop reordering
- Collection-level variables and auth inheritance
- Duplicate, export, delete collections

**US-2.4:** As a user, I want to use drag-and-drop to reorganize my requests and folders.

**Acceptance Criteria:**
- Drag requests between folders
- Drag folders to reorder or nest
- Visual drop indicators
- Undo support for accidental moves

---

### Epic 3: Request Builder & Client

**US-3.1:** As a developer, I want a full-featured request builder so that I can construct and send HTTP requests.

**Acceptance Criteria:**
- Support all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- URL input with environment variable highlighting
- Query parameters editor (key-value table)
- Headers editor with common header autocomplete
- Request body with format options:
  - JSON (with syntax highlighting and validation)
  - Form-data (with file upload support)
  - x-www-form-urlencoded
  - Raw (text, XML, HTML)
  - Binary file upload
  - GraphQL (query + variables)

**US-3.2:** As a developer, I want to save requests explicitly to my collections so that I can reuse them later.

**Acceptance Criteria:**
- "Save" button (Cmd/Ctrl+S) opens save dialog
- Choose target collection and folder
- Name and describe the request
- "Save As" for creating copies
- Unsaved changes indicator (dot on tab)

**US-3.3:** As a developer, I want to view request history so that I can recall recent requests without saving them.

**Acceptance Criteria:**
- Auto-log all sent requests to history
- History shows: method, URL, timestamp, status code
- Click to restore request to builder
- Filter history by date, method, status
- Clear history option
- History is local-only, not synced

---

### Epic 4: Response Viewer

**US-4.1:** As a developer, I want a pretty response viewer so that I can easily read API responses.

**Acceptance Criteria:**
- JSON syntax highlighting with collapsible nodes
- XML syntax highlighting
- HTML rendered preview
- Raw text view
- Copy response body
- Search within response (Cmd/Ctrl+F)

**US-4.2:** As a developer, I want to see response metadata so that I can debug performance issues.

**Acceptance Criteria:**
- Status code with color-coded badge (2xx green, 4xx orange, 5xx red)
- Response time in milliseconds
- Response size (headers + body)
- Response headers in collapsible panel
- Timing breakdown (DNS, TCP, TLS, TTFB, Download)

**US-4.3:** As a developer, I want to compare responses between requests so that I can identify differences.

**Acceptance Criteria:**
- "Compare" action on response
- Select two responses from history or saved
- Side-by-side diff view
- Highlight additions, deletions, changes
- Filter: show all / only differences

---

### Epic 5: Environments & Variables

**US-5.1:** As a developer, I want to create multiple environments so that I can switch between dev, staging, and production.

**Acceptance Criteria:**
- Create environments at project level
- Environment has: name, variables (key-value)
- Quick environment switcher in header
- Active environment indicator
- Variables support: string, secret (masked)

**US-5.2:** As a developer, I want to use variables in requests with `{{variableName}}` syntax.

**Acceptance Criteria:**
- Variable substitution in: URL, headers, body, auth fields
- Syntax highlighting for `{{variables}}`
- Autocomplete when typing `{{`
- Preview resolved values on hover
- Warning for undefined variables

**US-5.3:** As a developer, I want variable scopes (global, project, collection, environment) so that I can override values appropriately.

**Acceptance Criteria:**
- Global variables (workspace-wide)
- Project variables
- Collection variables
- Environment variables (highest priority)
- Clear precedence: environment > collection > project > global

---

### Epic 6: Authentication

**US-6.1:** As a developer, I want preset authentication types so that I can easily authenticate requests.

**Acceptance Criteria:**
- No Auth
- API Key (header or query param)
- Bearer Token
- Basic Auth (username/password)
- Auth inheritance from parent folder/collection

**US-6.2:** As a developer, I want OAuth 2.0 support so that I can authenticate with modern APIs.

**Acceptance Criteria:**
- Authorization Code flow (with PKCE)
- Client Credentials flow
- Implicit flow (legacy support)
- Token refresh handling
- Callback URL configuration
- Token storage in environment variables

**US-6.3:** As an enterprise user, I want SSO with Keycloak so that my team can use corporate credentials.

**Acceptance Criteria:**
- Keycloak OIDC integration
- Configure Keycloak realm, client ID, URLs
- Login redirects to Keycloak
- Token-based session management
- Role-based access (future: admin, editor, viewer)
- Logout and session expiry handling

---

### Epic 7: API Documentation (Redocly Style)

**US-7.1:** As a developer, I want beautiful, read-only API documentation generated from my OpenAPI spec.

**Acceptance Criteria:**
- Clean, Redocly-inspired design
- Three-panel layout: navigation, content, code samples
- Endpoint list grouped by tags
- Search across all endpoints
- Dark/light theme support

**US-7.2:** As a developer, I want detailed endpoint documentation so that I understand how to use each API.

**Acceptance Criteria:**
- Method badge + path + summary
- Description with Markdown rendering
- Parameters table (path, query, header)
- Request body schema with examples
- Response schemas for all status codes
- Code samples in multiple languages (curl, JS, Python)

**US-7.3:** As a developer, I want schema documentation so that I understand data models.

**Acceptance Criteria:**
- Schema definitions from OpenAPI components
- Property list with types, required flags, descriptions
- Nested object expansion
- Enum value lists
- Example values

**US-7.4:** As a team lead, I want to share API documentation via URL so that external developers can access it.

**Acceptance Criteria:**
- Public/private toggle for API definitions
- Shareable URL for public docs
- Optional password protection
- Custom slug for clean URLs

---

### Epic 8: Mock Generation & Management

**US-8.1:** As a developer, I want to generate mocks from my API definition so that I can test frontend without a backend.

**Acceptance Criteria:**
- "Generate Mocks" action on API definition
- Select which endpoints to mock
- Use OpenAPI examples or generate from schema
- Configure response delays
- Choose success/error response variations

**US-8.2:** As a developer, I want to customize mock responses so that I can simulate edge cases.

**Acceptance Criteria:**
- Edit generated mock responses
- Add conditional responses (based on query params, headers)
- Response delay simulation
- Error response simulation (timeout, 500, etc.)

**US-8.3:** As a developer, I want mocks linked to their source API definition so that I can regenerate when the spec changes.

**Acceptance Criteria:**
- Visual link from mock to API definition
- "Sync" action to update mocks from spec
- Diff view showing what will change
- Preserve manual customizations option

---

### Epic 9: Cloud Sync (Future Phase)

**US-9.1:** As a team member, I want optional cloud sync so that I can access my work from multiple devices.

**Acceptance Criteria:**
- Opt-in cloud sync (local-first by default)
- Sync workspaces, collections, environments
- Conflict resolution for concurrent edits
- Offline support with sync on reconnect
- Self-hosted sync server option

**US-9.2:** As a team lead, I want to share collections with my team so that we can collaborate.

**Acceptance Criteria:**
- Invite team members to workspace
- Permission levels: view, edit, admin
- Real-time collaboration indicators
- Activity log for changes

---

## Technical Requirements

### Architecture

- **Framework:** Nuxt 3 (existing)
- **Database:** SQLite with Drizzle ORM (existing, extend schema)
- **API:** Nuxt server routes (existing pattern)
- **State Management:** Pinia (add for complex client state)
- **UI Components:** Extend existing component library

### New Database Entities

```
Workspace
├── id, name, created_at, updated_at
├── owner_id (for future multi-user)

Project
├── id, workspace_id, name, base_url, created_at

Collection
├── id, project_id, name, description, auth_config

Folder
├── id, collection_id, parent_folder_id, name, order

SavedRequest
├── id, folder_id, name, method, url, headers, body, auth

Environment
├── id, project_id, name, is_active

EnvironmentVariable
├── id, environment_id, key, value, is_secret

APIDefinition
├── id, project_id, name, spec_format, spec_content, source_url

RequestHistory
├── id, workspace_id, method, url, request_data, response_data, timestamp
```

### API Endpoints (Server Routes)

```
# Workspaces
GET/POST    /api/workspaces
GET/PUT/DEL /api/workspaces/:id

# Projects
GET/POST    /api/workspaces/:id/projects
GET/PUT/DEL /api/projects/:id

# Collections
GET/POST    /api/projects/:id/collections
GET/PUT/DEL /api/collections/:id

# Folders & Requests
GET/POST    /api/collections/:id/items
PUT/DEL     /api/folders/:id
PUT/DEL     /api/requests/:id

# Environments
GET/POST    /api/projects/:id/environments
GET/PUT/DEL /api/environments/:id

# API Definitions
GET/POST    /api/projects/:id/definitions
POST        /api/definitions/import
GET/PUT/DEL /api/definitions/:id
POST        /api/definitions/:id/generate-mocks

# Request Execution
POST        /api/proxy/request (send real HTTP requests)

# History
GET         /api/history
DEL         /api/history
```

### Key Libraries to Add

- `@apidevtools/swagger-parser` - OpenAPI parsing and validation
- `@redocly/openapi-core` - OpenAPI linting (optional)
- `postman-collection` - Postman collection parsing
- `axios` or native fetch - HTTP client for proxy requests
- `json-diff` - Response comparison
- `keycloak-js` - Keycloak SSO integration
- `monaco-editor` or `codemirror` - Code/JSON editing

### Security Considerations

- Proxy requests server-side to avoid CORS issues
- Sanitize imported specs for XSS
- Encrypt secret environment variables at rest
- Keycloak tokens stored securely (httpOnly cookies)
- Rate limiting on proxy endpoint

---

## UI/UX Design Guidelines

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Logo    [Workspace ▼]    [Environment ▼]    [User Menu]   │
├─────────┬───────────────────────────────────────────────────┤
│ Sidebar │  Tabs: [Request 1] [Request 2] [+ New]           │
│         ├───────────────────────────────────────────────────┤
│ • Collec│  ┌─────────────────────────────────────────────┐  │
│   └ Fold│  │ [GET ▼] [_URL with {{variables}}_______] [Send]│
│     └ Re│  ├─────────────────────────────────────────────┤  │
│ • API De│  │ [Params] [Headers] [Body] [Auth]            │  │
│ • Docs  │  │ Key-value editor or JSON editor             │  │
│ • Histor│  ├─────────────────────────────────────────────┤  │
│         │  │ Response: 200 OK  │ 245ms │ 1.2 KB          │  │
│         │  │ [Body] [Headers] [Cookies]                  │  │
│         │  │ { "data": ... }                             │  │
│         │  └─────────────────────────────────────────────┘  │
└─────────┴───────────────────────────────────────────────────┘
```

### API Documentation View

```
┌─────────────────────────────────────────────────────────────┐
│  [← Back to App]    API Documentation    [Theme Toggle]    │
├─────────┬─────────────────────────────┬─────────────────────┤
│ Search  │  GET /users                 │  curl example      │
│         │  ─────────────────────────  │  ─────────────────  │
│ Endpoin │  Retrieve a list of users.  │  curl -X GET \     │
│  Auth   │                             │   https://api...   │
│  Users  │  Parameters                 │                    │
│   GET / │  ┌──────┬────────┬───────┐  │  JavaScript        │
│   POST /│  │ Name │ Type   │ Desc  │  │  ─────────────────  │
│   GET /{│  ├──────┼────────┼───────┤  │  fetch('/users')   │
│  Orders │  │ limit│ integer│ Max...│  │                    │
│         │  └──────┴────────┴───────┘  │                    │
└─────────┴─────────────────────────────┴─────────────────────┘
```

### Design Principles

1. **Familiar:** Mirror Postman's mental model for easy adoption
2. **Clean:** Redocly-inspired docs with focus on readability
3. **Fast:** Keyboard shortcuts for power users (Cmd+Enter to send)
4. **Responsive:** Work on various screen sizes

---

## Phases & Milestones

### Phase 1: Foundation (Weeks 1-3)
- [ ] Database schema for new entities
- [ ] Workspace/Project/Collection CRUD
- [ ] Basic request builder UI
- [ ] Send requests via server proxy
- [ ] Response viewer with JSON highlighting

### Phase 2: Import & Mocks (Weeks 4-5)
- [ ] OpenAPI 3.x import and parsing
- [ ] Postman Collection import
- [ ] Generate mocks from API definitions
- [ ] Link mocks to API definitions

### Phase 3: Environments & Auth (Weeks 6-7)
- [ ] Environment management
- [ ] Variable substitution engine
- [ ] Basic auth types (Bearer, API Key, Basic)
- [ ] OAuth 2.0 flows

### Phase 4: API Documentation (Weeks 8-9)
- [ ] Redocly-style documentation viewer
- [ ] Code sample generation
- [ ] Schema documentation
- [ ] Shareable public docs

### Phase 5: Advanced Features (Weeks 10-11)
- [ ] Request history
- [ ] Response comparison
- [ ] Keycloak SSO integration
- [ ] Request timing breakdown

### Phase 6: Polish & Migration (Week 12)
- [ ] Migrate existing mock data to new schema
- [ ] Keyboard shortcuts
- [ ] Documentation and onboarding
- [ ] Performance optimization

---

## Success Metrics

1. **Adoption:** Replace Postman for daily API development work
2. **Import Success:** >95% of OpenAPI specs import without errors
3. **Performance:** Request builder loads in <500ms
4. **Documentation Quality:** Docs render identically to Redocly

---

## Out of Scope (Future Consideration)

- Test scripts (pre-request, post-response JavaScript)
- API monitoring and scheduled requests
- Mock server as standalone Docker deployment
- Team collaboration features (Phase 2 after cloud sync)
- GraphQL schema introspection
- gRPC support
- WebSocket testing

---

## Open Questions

1. Should we rename the product? (MockAPI Studio, APIForge, OpenMock, etc.)
2. License model: Keep open source or dual license?
3. Branding and visual identity refresh?