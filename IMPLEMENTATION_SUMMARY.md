# Implementation Summary: Request Editor Enhancements

## Overview
This document summarizes the implementation of request editor enhancements for Maresto, including collection-level authentication inheritance and JSONC support.

---

## Phase 1: Collection Auth Inheritance ✅

### What Was Implemented

#### 1. Collection Auth Store (`stores/collection-auth.ts`)
- Created new Pinia store for managing collection-level authentication
- Supports API Key, Bearer, Basic, and OAuth2 authentication types
- Stores auth configuration per collection

#### 2. Collection Auth API Endpoints (`server/api/collections/[id]/auth/`)
**GET `/api/collections/[id]/auth`**
- Fetches collection's auth configuration
- Returns: `{ auth: AuthConfig | null }`

**POST `/api/collections/[id]/auth`**
- Creates/updates collection auth configuration
- Body: `{ auth: AuthConfig }`
- Returns: `{ auth: AuthConfig }`

**DELETE `/api/collections/[id]/auth`**
- Deletes collection auth configuration
- Returns: `{ success: true }`

#### 3. Collection Auth Manager Component (`components/CollectionAuthManager.vue`)
Features:
- Clean UI for managing collection-level authentication
- Toggle to enable/disable auth inheritance for requests
- Auth type selector (API Key, Bearer, Basic, OAuth2)
- Type-specific input fields:
  - **API Key**: Key name, value, placement (header/query), prefix
  - **Bearer**: Token field
  - **Basic**: Username and password
  - **OAuth2**: Grant type, auth URL, token URL, client ID, client secret, scopes
- OAuth2 token testing with "Get Token" button
- Real-time preview of auth configuration
- Status indicator showing if collection auth is configured

#### 4. RequestBuilder Integration
Added:
- `inheritFromParent` computed property
- `collectionAuth` reactive reference
- `fetchCollectionAuth()` method to load collection auth
- Watchers for `collectionId` and `inheritFromParent` changes
- Auth input fields hidden when inheritance is enabled
- `buildAuthHeaders()` method updated to respect inheritance setting
- `buildAuthQueryParams()` method updated to respect inheritance setting

#### 5. Request Tab Integration
- Integrated CollectionAuthManager into request tabs
- CollectionAuthManager shown when a request belongs to a collection
- RequestBuilder receives collection context for inheritance

### Database Schema (Supabase)
```sql
CREATE TABLE collection_auth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('api-key', 'bearer', 'basic', 'oauth2')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id)
);

CREATE INDEX idx_collection_auth_collection ON collection_auth(collection_id);
```

---

## Phase 2: JSONC Support in Request Body ✅

### What Was Implemented

#### 1. Installed Dependencies
```bash
npm install jsonc-parser
```

#### 2. Created JSONC Utility (`utils/jsonc.ts`)
Features:
- `parseJSONC()` - Parse JSONC string to object
- `stringifyJSONC()` - Convert object to JSON string
- `stripComments()` - Remove comments from JSONC
- `validateJSONC()` - Validate JSONC with detailed error messages
- `getJSONCError()` - Get user-friendly error message with position

#### 3. Updated VariableTextarea Component
- Added `enableJsonc` prop
- Changed JSON parsing to use `parseJSONC()` when JSONC is enabled
- Removed hardcoded `language="json"` - now uses prop
- Updated value processing to strip comments for JSONC mode

#### 4. Updated RequestBuilder Component
- Imported `validateJSONC` from JSONC utility
- Imported `stripComments` from JSONC utility (already used)
- Updated VariableTextarea to use `enable-jsonc` prop
- Updated validation to use `validateJSONC()` instead of `validateJson()`
- Updated `validateJson()` function to call `validateJSONC()`

### JSONC Features Supported
```jsonc
{
  // Single-line comment
  "name": "value",
  
  /* Multi-line
     comment */
  "object": {
    "nested": true // Inline comment
  },
  
  "array": [
    1,
    2, // Trailing comment
    3
  ],
  
  "trailing": "comma allowed",
}
```

---

## Phase 3: Variable Tooltip Component ✅

### What Was Implemented

#### Created VariableTooltip Component (`components/VariableTooltip.vue`)
Features:
- Hover-triggered tooltip with configurable delay
- Displays variable key and current value
- Environment name badge
- Secret value handling:
  - Values hidden by default (shown as `••••••••`)
  - Eye icon to reveal secret values on hover
  - Auto-hide after revealing
- Copy button to copy variable value
- Position-aware tooltip (adjusts to viewport)
- Smooth fade-in/fade-out transitions
- Teleport to body for proper z-index stacking

#### Integration Points (Ready for Use)
The VariableTooltip component wraps any element and provides hover preview:

```vue
<VariableTooltip :variable="variable" :environment-name="env.name">
  <span class="text-accent-blue">{{ variable.key }}</span>
</VariableTooltip>
```

---

## Files Created

1. `/stores/collection-auth.ts` - Collection auth Pinia store
2. `/components/CollectionAuthManager.vue` - Collection auth management UI
3. `/utils/jsonc.ts` - JSONC parsing and validation utilities
4. `/components/VariableTooltip.vue` - Variable preview tooltip
5. `/server/api/collections/[id]/auth/index.get.ts` - GET collection auth endpoint
6. `/server/api/collections/[id]/auth/index.post.ts` - POST collection auth endpoint
7. `/server/api/collections/[id]/auth/index.delete.ts` - DELETE collection auth endpoint

---

## Files Modified

1. `/components/RequestBuilder.vue`
   - Added collection auth inheritance logic
   - Updated JSON validation to use JSONC
   - Added watchers for collection auth changes
   - Hidden auth inputs when inheritance enabled

2. `/components/VariableTextarea.vue`
   - Added `enableJsonc` prop
   - Integrated JSONC parsing
   - Updated value processing

3. `/package.json`
   - Added `jsonc-parser` dependency

---

## How to Test

### Collection Auth Inheritance

1. **Setup Collection Auth**:
   - Open a request that belongs to a collection
   - Click on "Collection Auth" tab in the sidebar
   - Configure auth (e.g., API Key with header placement)
   - Save the collection auth configuration

2. **Test Inheritance**:
   - In the request, enable "Inherit from Parent" checkbox
   - Auth input fields should be hidden
   - Send request - it should use collection auth
   - Check request headers/params to verify auth is applied

3. **Test Override**:
   - Disable "Inherit from Parent"
   - Auth input fields should appear
   - Configure request-level auth
   - Send request - it should use request-level auth

### JSONC Support

1. **Test Comments**:
   - Open a request with JSON body
   - Add single-line comments: `// comment`
   - Add multi-line comments: `/* comment */`
   - Validation should show "Valid JSON"
   - Send request - comments should be stripped before sending

2. **Test Trailing Commas**:
   - Add trailing commas in objects and arrays
   - Validation should still show "Valid JSON"
   - Send request - trailing commas should be handled

### Variable Tooltip

1. **Test Tooltip Display**:
   - Hover over a variable reference (e.g., `{{api_key}}`)
   - Tooltip should appear after delay (300ms)
   - Shows variable key, value, and environment name

2. **Test Secret Variables**:
   - Create a secret variable
   - Hover over its reference
   - Value should be hidden (••••••••)
   - Hover over eye icon to reveal
   - Click copy button to copy value

---

## API Reference

### Collection Auth Endpoints

#### GET `/api/collections/:id/auth`
Fetches collection auth configuration.

**Response:**
```json
{
  "auth": {
    "type": "api-key",
    "config": {
      "key": "X-API-Key",
      "value": "abc123",
      "placement": "header",
      "prefix": ""
    }
  }
}
```

#### POST `/api/collections/:id/auth`
Creates or updates collection auth.

**Body:**
```json
{
  "auth": {
    "type": "bearer",
    "config": {
      "token": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

#### DELETE `/api/collections/:id/auth`
Deletes collection auth configuration.

**Response:**
```json
{
  "success": true
}
```

---

## Environment Variables Required

Ensure these are set in your `.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create collection_auth table
CREATE TABLE IF NOT EXISTS collection_auth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('api-key', 'bearer', 'basic', 'oauth2')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_collection_auth_collection ON collection_auth(collection_id);

-- Enable RLS
ALTER TABLE collection_auth ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage collection auth in their workspaces"
  ON collection_auth
  FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM collections
      WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

---

## Commands to Run

After completing the implementation:

```bash
# Install new dependency
npm install

# Generate Supabase types (if using Supabase CLI)
npm run db:generate-types

# Run development server
npm run dev

# Run tests (if available)
npm run test
```

---

## Known Limitations & Future Enhancements

### Current Limitations
1. Collection auth inheritance only works when request belongs to a collection
2. No inheritance chain (collection → folder → request) - only direct collection inheritance
3. VariableTooltip not yet integrated into VariableTextarea (ready for implementation)

### Future Enhancements
1. **Folder-level auth** - Add auth at folder level with inheritance chain
2. **Auth profiles** - Save multiple auth configs per collection
3. **Variable hover in all fields** - Integrate VariableTooltip in headers, params, body
4. **Auth variables** - Use variables in auth configuration
5. **OAuth2 token refresh** - Auto-refresh tokens before expiry
6. **Auth testing** - Test auth configuration before saving

---

## Support

For issues or questions:
1. Check the logs in browser console
2. Verify database migration was successful
3. Ensure environment variables are set
4. Check Supabase logs for API errors

---

## Summary

All three phases have been successfully implemented:

1. ✅ **Collection Auth Inheritance** - Complete with UI, API, and integration
2. ✅ **JSONC Support** - Complete with validation and parsing
3. ✅ **Variable Tooltip** - Component created and ready for integration

The implementation follows Maresto's existing patterns and maintains compatibility with current functionality.