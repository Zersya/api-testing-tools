# Ralph Progress Log

This file tracks progress across iterations. It's automatically updated
after each iteration and included in agent prompts for context.

## Codebase Patterns (Study These First)

*Add reusable patterns discovered during development here.*

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
