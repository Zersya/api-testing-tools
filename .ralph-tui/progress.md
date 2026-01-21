# Ralph Progress Log

This file tracks progress across iterations. It's automatically updated
after each iteration and included in agent prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

- OAuth 2.0 implementations should use conditional rendering (`v-if`) to show/hide grant-type-specific configuration fields (Auth URL, Callback URL, PKCE only needed for Authorization Code flow)
- Keycloak SSO requires PKCE for secure OAuth flow (code_challenge with S256)
- User info from OAuth providers should be stored in a separate cookie for client-side access
- Auth state checking should return both token status and user information for UI updates
- Session expiry can be proactively checked on the client side with periodic polling
- Drag-and-drop in Vue requires careful key management - keys must be on template tags for v-for loops, not inner elements
- Drag-and-drop state (dragging ID, drop target) should be lifted to parent component for coordination
- Circular reference validation is essential when moving folders to prevent infinite nesting
- Visual drop indicators should use absolute positioning with calculated offsets for precise placement
- Optimistic UI updates for drag-and-drop should refresh data after server confirmation to ensure consistency

---

## 2026-01-21 - US-043

**What was implemented:**
- Added `getClientCredentialsToken` function for direct token fetch without user interaction
- Updated UI to hide Auth URL, Callback URL, and PKCE fields when Client Credentials grant type is selected
- Modified `refreshAccessToken` to delegate to `getClientCredentialsToken` for client_credentials flow
- Updated `autoRefreshToken` to handle client_credentials tokens (no refresh token needed, just fetch new token)
- Client credentials button calls `getClientCredentialsToken` directly

**Files changed:**
- `app/components/RequestBuilder.vue` - Added Client Credentials flow implementation

**Learnings:**
- Client Credentials flow: POST directly to token URL with `grant_type=client_credentials`, client_id, and client_secret
- Client Credentials doesn't use refresh tokens - just fetch a new token when expired
- OAuth configuration fields that are grant-type specific should be conditionally rendered based on `oauth2.grantType`
- Auto-refresh for client_credentials: call `getClientCredentialsToken()` when token is near expiry (5 min threshold)

**Gotchas:**
- Don't call `refreshAccessToken` for client_credentials - it expects a refresh token which doesn't exist in this flow
- Vue template structure is critical - duplicate or misplaced closing tags cause "Invalid end tag" build errors
- Server build issues with `../../../db` imports are pre-existing and unrelated to OAuth implementation

---

## 2026-01-21 - US-042

**What was implemented:**
- Added OAuth 2.0 Authorization Code flow support to RequestBuilder.vue auth tab
- OAuth 2.0 auth type option in the auth type selector
- Configuration fields: auth URL, token URL, client ID, client secret, scopes, callback URL
- "Get New Access Token" button that initiates OAuth popup flow
- PKCE support for secure OAuth implementation
- Token refresh handling with automatic refresh before expiry
- Token storage in environment variables via "Store in Env" button
- Client Credentials grant type support
- Server endpoints: `/api/oauth/callback`, `/api/oauth/token`, `/api/oauth/store-tokens`

**Files changed:**
- `app/components/RequestBuilder.vue` - Added OAuth 2.0 auth type, configuration UI, token handling
- `app/components/ApiDocumentationViewer.vue` - Fixed duplicate class attributes on SVG elements
- `app/components/ImportModal.vue` - Fixed unescaped quotes in placeholder attribute
- `app/components/RequestTabs.vue` - Fixed optional chaining assignment syntax
- `app/assets/css/main.css` - Fixed @speed-highlight/core CSS import path
- `app/pages/docs/[slug].vue` - Fixed import path for openapi types
- `app/types/openapi.ts` (new) - Shared type definitions for OpenAPI specs
- `server/api/oauth/callback.get.ts` (new) - OAuth callback handler
- `server/api/oauth/token.post.ts` (new) - Token exchange endpoint
- `server/api/oauth/store-tokens.post.ts` (new) - Token storage in environment variables

**Learnings:**
- Vue template parsing can fail with duplicate attributes on the same element (e.g., two `class` attributes)
- Optional chaining assignment (`?.=`) is not supported in Vue templates - use traditional `if` checks instead
- Nuxt 4 requires importing server-side utilities from `~/types/` or via API routes, not directly from `~/server/`
- @speed-highlight/core CSS imports use the pattern `@import '@speed-highlight/core/themes/default.css'` without `/dist/`
- OAuth 2.0 flows require careful state management (stored in sessionStorage for PKCE verification)
- Vue's v-if/v-else-if/v-else chains must be properly nested at the same level

**Gotchas:**
- Vue compiler treats duplicate attributes on the same element as invalid HTML, causing "Invalid end tag" errors
- Nuxt 4's compatibility mode changes how server-side imports work in client components
- OAuth callback URLs must match exactly between the client configuration and OAuth provider settings
- Token refresh should happen proactively (e.g., 5 minutes before expiry) to avoid request failures

---

## 2025-01-21 - US-041

**What was implemented:**
- Created `ResponseComparison.vue` component for side-by-side diff view with LCS algorithm for diff computation
- Modified `RequestHistoryPanel.vue` to support multi-select for comparison with checkboxes
- Added compare button and selection UI in history panel header
- Updated `AppSidebar.vue` to pass compare events through from RequestHistoryPanel
- Updated `admin/index.vue` to handle comparison state and display the comparison modal
- Implemented diff highlighting: green for additions, red for deletions, yellow for changes
- Added filter to show only differences vs all content

**Files changed:**
- `app/components/ResponseComparison.vue` (new)
- `app/components/RequestHistoryPanel.vue`
- `app/components/AppSidebar.vue`
- `app/pages/admin/index.vue`

**Learnings:**
- Nuxt 3 auto-imports components and composables from `~/components` and `~/composables`
- Event bubbling in Vue: need to use `.stop` modifier to prevent unwanted click events on child elements
- LCS (Longest Common Subsequence) algorithm works well for line-by-line diff comparison of JSON responses
- Tailwind color tokens follow a consistent pattern (`accent-*`, `bg-*`, `text-*`)
- State management patterns: using `ref` and `computed` for reactive state

**Gotchas:**
- When adding click handlers to elements that also have child interactive elements (checkboxes, buttons), need to check if click target is the interactive element to avoid double-handling
- Vue's `defineEmits` type inference works well but requires proper tuple types for events with multiple parameters
- CSS `whitespace-pre-wrap` is essential for preserving JSON formatting in pre elements

---## ✓ Iteration 1 - US-041: Response comparison UI
*2026-01-21T00:33:03.671Z (396s)*

**Status:** Completed

**Notes:**
sessionID":"ses_4220dea6cffeqcIk1aGNqoJv7e","part":{"id":"prt_bddf80b10001uCdXNMXnJlgJaL","sessionID":"ses_4220dea6cffeqcIk1aGNqoJv7e","messageID":"msg_bddf7fa3e001qoOacG7uBuUv3u","type":"step-start","snapshot":"36d52cbb566d6595e56892dd4a5c2056d3afc43d"}}
{"type":"text","timestamp":1768955583528,"sessionID":"ses_4220dea6cffeqcIk1aGNqoJv7e","part":{"id":"prt_bddf80b12001DvjvkwJ7m8hrCD","sessionID":"ses_4220dea6cffeqcIk1aGNqoJv7e","messageID":"msg_bddf7fa3e001qoOacG7uBuUv3u","type":"text","text":"

---
## ✓ Iteration 2 - US-042: OAuth 2.0 - Authorization Code flow
*2026-01-21T01:00:31.545Z (1647s)*

**Status:** Completed

**Notes:**
ain.css** - Fixed @speed-highlight/core CSS import path\n- **app/pages/docs/[slug].vue** - Fixed import path for openapi types\n- **app/types/openapi.ts** (new) - Shared type definitions for OpenAPI specs\n- **server/api/oauth/callback.get.ts** (new) - OAuth callback handler\n- **server/api/oauth/token.post.ts** (new) - Token exchange endpoint\n- **server/api/oauth/store-tokens.post.ts** (new) - Token storage in environment variables\n- **tasks/prd.json** - Updated US-042 status to completed\n\n

---
## ✓ Iteration 3 - US-043: OAuth 2.0 - Client Credentials flow
*2026-01-21T01:05:33.745Z (301s)*

**Status:** Completed

**Notes:**
sessionID":"ses_421eeb5bcffexni3Q4D6hUdnIr","part":{"id":"prt_bde15dbac001jrg9JtDpYBmg8a","sessionID":"ses_421eeb5bcffexni3Q4D6hUdnIr","messageID":"msg_bde15ce970011A9TuSzEcf6gYV","type":"step-start","snapshot":"dfbd3d380dc022554f7226567d95a2f4b0004f17"}}
{"type":"text","timestamp":1768957533610,"sessionID":"ses_421eeb5bcffexni3Q4D6hUdnIr","part":{"id":"prt_bde15dda7001syR3yeGAb2qcGG","sessionID":"ses_421eeb5bcffexni3Q4D6hUdnIr","messageID":"msg_bde15ce970011A9TuSzEcf6gYV","type":"text","text":"

---

## 2026-01-21 - US-044

**What was implemented:**
- Added Keycloak configuration page at `/admin/keycloak` with realm, client ID, and OIDC endpoint configuration
- Added "Login with Keycloak" button on the login page when SSO is enabled
- Created `/api/auth/keycloak/login` endpoint that redirects to Keycloak with PKCE flow
- Created `/api/auth/keycloak/callback` endpoint to handle OIDC callback and token exchange
- Created `/api/auth/logout` endpoint to clear session and optionally redirect to Keycloak logout
- Updated `/api/auth/check` to return user info, auth method, and token expiry
- Updated AppHeader to display logged-in user info with avatar, name, email, and session timer
- Added user dropdown menu with Keycloak settings link and logout option

**Files changed:**
- `app/pages/admin/keycloak.vue` (new) - Keycloak SSO configuration page
- `app/pages/login.vue` - Added Keycloak login button
- `app/components/AppHeader.vue` - Added user info display and logout functionality
- `server/api/auth/keycloak/login.get.ts` (new) - Keycloak login redirect endpoint
- `server/api/auth/keycloak/callback.get.ts` (new) - OIDC callback handler
- `server/api/auth/logout.post.ts` (new) - Logout endpoint
- `server/api/auth/check.get.ts` - Updated to return user info and token expiry
- `nuxt.config.ts` - Added public.appUrl to runtime config

**Learnings:**
- Keycloak uses standard OIDC endpoints: `/auth`, `/token`, `/userinfo`, `/logout`
- PKCE (Proof Key for Code Exchange) is essential for secure OAuth flows - use code_challenge with S256
- Keycloak tokens include an id_token that contains user identity claims
- User info from OAuth providers needs to be stored separately since JWT tokens don't expose all claims
- Nuxt 4's runtime config requires `public` prefix for client-accessible config values
- Cookie-based session storage needs httpOnly flag for security but user info cookie needs to be accessible to client

**Gotchas:**
- Keycloak realm name must match exactly (case-sensitive)
- Callback URL must be registered as a valid redirect URI in Keycloak client configuration
- Code verifier must be stored server-side in a signed cookie for PKCE verification
- Base64url encoding is required for PKCE code challenge (not standard base64)
- JWT verification uses client_secret for Keycloak (not jwtSecret from config)
- Logout redirect URI must be an exact match in Keycloak logout configuration
## ✓ Iteration 4 - US-044: Keycloak SSO integration
*2026-01-21T01:10:25.784Z (291s)*

**Status:** Completed

**Notes:**
config\n\n**Features Implemented:**\n1. Keycloak configuration page with realm, client ID, and OIDC endpoint fields\n2. Login with Keycloak button on the login page\n3. PKCE flow for secure OAuth authentication\n4. Token exchange and user info fetching from Keycloak UserInfo endpoint\n5. User avatar with initials, name, email display\n6. Session timer showing time until token expiry\n7. Logout with optional Keycloak single logout redirect\n\n**To run the build:**\n```bash\nnpm run build\n```\n\n---\n\n## 2026-01-21 - US-045\n\n**What was implemented:**\n- Added drag-and-drop reordering functionality to the sidebar hierarchy view\n- FolderTreeItem.vue now supports dragging folders and requests with visual indicators\n- Implemented blue drop indicator lines for showing where items will be placed\n- Added highlight styling for valid drop targets (folder body for nesting, between items for reordering)\n- Prevented invalid drops: folders cannot be dropped into themselves or their descendants (circular reference prevention)\n- Created server API endpoints: `/api/admin/folders/reorder` and `/api/admin/requests/reorder` for batch updates\n- Added optimistic UI updates that refresh data after server confirmation\n- AppSidebar.vue now emits `reorderFolders` and `reorderRequests` events with update payloads\n\n**Files changed:**\n- `app/components/FolderTreeItem.vue` - Added drag-and-drop support with visual indicators\n- `app/components/AppSidebar.vue` - Added drag event handlers and reorder logic\n- `app/pages/admin/index.vue` - Added handlers for reorder events\n- `server/api/admin/folders/reorder.post.ts` (new) - Batch folder reorder endpoint\n- `server/api/admin/requests/reorder.post.ts` (new) - Batch request reorder endpoint\n\n**Learnings:**\n- Vue requires keys on `<template>` tags for v-for loops, not on child elements - this causes build errors\n- Circular reference validation must check the entire ancestor chain when moving folders\n- Drop position detection requires tracking mouse position relative to target elements\n- For nested tree structures, drop indicators need careful absolute positioning calculations\n- Batch update endpoints should process all updates in a single transaction for consistency\n\n**Gotchas:**\n- Vue template key placement: `:key` on `<template>` for v-for, never on inner divs\n- Drop target state needs to be cleared on both `dragend` and when moving to invalid targets\n- Absolute positioning for drop indicators requires knowing exact element heights (36px per request row)\n- Server endpoints must validate that folders belong to the same collection when changing parent

---
