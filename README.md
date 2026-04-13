# Mock Service (v0.5.8)

A full-stack API workspace for building, testing, mocking, documenting, and sharing APIs.

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js
- [Rust](https://www.rust-lang.org/tools/install)
- PostgreSQL database
- Redis (optional, recommended for production deployments)
- Node.js 20+ (recommended) if using npm

## Installation

1. **Clone repository**
2. **Install dependencies**

   ```bash
   bun install
   # or
   npm install
   ```

3. **Install Rust targets (for macOS universal build):**
   ```bash
   rustup target add aarch64-apple-darwin x86_64-apple-darwin
   ```

4. **Create environment file**

   ```bash
   cp .env.example .env
   ```

5. **Configure required env vars** in `.env`
   - `DATABASE_URL` - PostgreSQL connection string
   - `ADMIN_EMAIL` - Default admin email
   - `ADMIN_PASSWORD` - Default admin password (change in production!)
   - `JWT_SECRET` - Secret for JWT tokens (use strong random string in production!)
   - `APP_URL` - Public application URL (for OAuth callbacks)
   - `REDIS_URL` - Redis connection (optional, recommended for production)
   - `APP_ENV` - Environment (local, development, production)
   - `APP_DOMAIN` - Application domain

   Optional SSO configuration:
   - `KEYCLOAK_*` - Keycloak OAuth
   - `GOOGLE_CLIENT_ID/SECRET` - Google OAuth
   - `GITHUB_CLIENT_ID/SECRET` - GitHub OAuth
   - `AZURE_*` - Azure AD OAuth

6. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

7. **(Optional) seed default workspace/project**

   ```bash
   npm run db:seed
   ```

8. **Generate app icons** (if `src-tauri/icons/` is empty):
   ```bash
   # Generate a placeholder icon (or replace app-icon.png with your own 1024x1024 PNG)
   python3 -c "
   import struct, zlib
   def make_png(w, h, r, g, b):
       def chunk(name, data):
           c = struct.pack('>I', len(data)) + name + data
           return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
       sig = b'\x89PNG\r\n\x1a\n'
       ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
       raw = b''.join(b'\x00' + bytes([r,g,b]*w) for _ in range(h))
       idat = chunk(b'IDAT', zlib.compress(raw))
       iend = chunk(b'IEND', b'')
       return sig + ihdr + idat + iend
   open('app-icon.png', 'wb').write(make_png(1024, 1024, 59, 130, 246))
   print('app-icon.png written (1024x1024 PNG)')
   "

   # Generate all icon sizes
   bun tauri icon ./app-icon.png
   ```

## Development

### Web Only (Browser)
```bash
bun run dev
# or
npm run dev
```
Opens at `http://localhost:3000`

### Desktop App (Tauri)
```bash
bun tauri:dev
```

## Building

### Web Build
```bash
bun run generate
```

### Desktop App

**macOS Universal (Intel + Apple Silicon):**
```bash
bun tauri build --target universal-apple-darwin
```

Output: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/Mock Service_0.2.1_universal.dmg`

**Platform-specific builds:**
```bash
# Apple Silicon only
bun tauri build --target aarch64-apple-darwin

# Intel only
bun tauri build --target x86_64-apple-darwin
```

## Project Structure

```
app/                    # Nuxt app pages/components
  pages/                # Application pages
    admin/              # Admin panel pages
      definitions/      # API definitions management
      environments/     # Environment management
    docs/               # Public API documentation
    docs-static/        # Public markdown docs
    shared-workspace/   # Shared workspace access
  components/           # Vue components
    RequestBuilder.vue  # Request builder component
    MockConfiguration.vue # Mock config component
    FeedbackModal.vue   # Feedback collection modal
    ShareWorkspaceModal.vue # Workspace sharing modal
    EnvironmentSwitcher.vue # Environment selector
    WorkspaceSwitcher.vue # Workspace selector
server/                 # API routes, middleware, services
  api/                  # API endpoints
    admin/              # Admin API routes
      super/            # Super admin endpoints
        usage/          # Usage analytics endpoints
        feedback/       # Feedback management endpoints
    auth/               # Authentication endpoints
      sso/              # SSO OAuth endpoints
    proxy/              # HTTP proxy execution
    definitions/        # API definition import/export
    history/            # Request history management
    feedback/           # Feedback submission endpoints
    shared-workspace/   # Shared workspace access
  middleware/           # Server middleware
    auth.ts             # JWT authentication middleware
  db/                   # Database layer
    schema/             # Drizzle schema definitions
      workspace.ts      # Workspace schema
      workspaceShare.ts # Workspace sharing schema
      workspaceMember.ts # Workspace members schema
      feedback.ts       # Feedback system schema
      usageAnalytics.ts # Usage tracking schema
      mocks.ts          # Mock configuration schema
      environment.ts    # Environment schema
      collection.ts     # Collection schema
      savedRequest.ts   # Saved requests schema
      requestHistory.ts # Request history schema
  utils/                # Utility functions
    magic-variables.ts  # Postman-style magic variables
drizzle/                # SQL migrations
docs/                   # Markdown docs served by slug
scripts/                # Utility scripts (version bump, etc.)
src-tauri/              # Rust backend (Tauri)
  src/                  # Rust source code
  icons/                # App icons (auto-generated)
  Cargo.toml            # Rust dependencies
```

## Available Scripts

### App lifecycle
- `npm run dev` - Run local development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run generate` - Generate static output

### Database (Drizzle)
- `npm run db:generate` - Generate migration files from schema
- `npm run db:migrate` - Apply migrations
- `npm run db:push` - Push schema directly to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:seed` - Seed default workspace/project data

### Versioning
- `npm run version:patch|minor|major`
- `npm run version:patch:push|minor:push|major:push`

### Tauri
- `bun tauri:dev` - Start desktop app in dev mode
- `bun tauri build` - Build desktop app installer
- `bun tauri icon ./app-icon.png` - Regenerate app icons

## Tech Stack

### Frontend
- **Nuxt 3** - Vue 3 framework
- **Vue 3** - Progressive JavaScript framework
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript

### Backend
- **Nuxt Nitro** - Server runtime
- **PostgreSQL** - Database
- **Drizzle ORM** - Database ORM
- **Redis** - Optional caching layer

### Authentication
- **JWT** - Token-based authentication
- **SSO Providers** - Keycloak, Google, GitHub, Azure AD

### Utilities
- `marked` + `highlight.js` for docs rendering
- `@faker-js/faker` for mock data generation
- `ioredis` for Redis integration
- `uuid` for unique identifiers

## Key Features

### Core Functionality
- Workspace-based API organization (workspaces, projects, collections, folders, requests)
- Request builder with headers, auth, body, scripts, and multiple examples
- HTTP proxy execution with environment variable substitution
- Postman-style magic variables (`{{$timestamp}}`, `{{$guid}}`, `{{$randomInt}}`, etc.)
- Cloud mock routing via collection-aware endpoints
- OpenAPI/Postman import support with automatic mock generation
- Public API documentation from imported specs
- Public markdown documentation pages

### Collaboration & Sharing
- Workspace sharing with shareable links (view/edit permissions)
- Workspace member management and access control
- Shared workspace access via unique tokens
- Request history tracking and comparison

### Analytics & Monitoring
- Usage analytics dashboard (super admin)
- Request execution tracking with response times
- Daily/weekly/monthly usage statistics
- User and workspace activity trends
- Success rate monitoring

### Admin Features
- Super admin panel for system management
- Feedback system with configurable forms
- SSO provider management (Keycloak, Google, GitHub, Azure AD)
- Workspace and user management
- Environment and variable management

### Authentication
- Email/password authentication
- Optional SSO providers (Keycloak, Google, GitHub, Azure AD)
- JWT-based session management
- Secure token-based workspace sharing

### Desktop App (Tauri)
- **Auto-Update (macOS Desktop App)**
  The desktop app includes a built-in auto-update feature using Tauri's updater plugin.

  ### How it Works
  1. The app automatically checks for updates on startup (every 24 hours)
  2. When an update is available, a notification appears
  3. Users can view release notes and install with one click
  4. The app downloads, verifies, installs the update, and restarts

  ### Setup for Developers
  1. **Generate Signing Keys**
     Updates must be cryptographically signed. Generate keys with:

     ```bash
     bash scripts/generate-updater-keys.sh
     ```

     This outputs:
     - **Public Key**: Add to `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
     - **Private Key**: Keep secret! Add to GitHub Secrets as `TAURI_SIGNING_PRIVATE_KEY`

  2. **Configure Update Server**
     Edit `src-tauri/tauri.conf.json`:

     ```json
     "plugins": {
       "updater": {
         "pubkey": "YOUR_PUBLIC_KEY_HERE",
         "endpoints": [
           "https://your-server.com/api/app/updates"
         ]
       }
     }
     ```

     Edit `server/api/app/updates.get.ts` to set the latest version:

     ```typescript
     const latestVersion = '0.2.2'; // Bump for new releases
     const baseUrl = 'https://your-cdn.com/updates';
     ```

  3. **Configure GitHub Secrets (for CI/CD)**
     Add to your GitHub repository:
     - `TAURI_SIGNING_PRIVATE_KEY` - The private key from step 1
     - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - (Optional) If you set a password

  4. **Release an Update**
     **Option A: GitHub Actions (Recommended)**

     ```bash
     # Tag and push a new version
     git tag v0.2.2
     git push origin v0.2.2
     ```

     GitHub Actions will:
     - Build the universal macOS app
     - Sign update files
     - Create a GitHub release
     - Upload artifacts

     **Option B: Manual Build**

     ```bash
     # Build the app
     bun tauri:build --target universal-apple-darwin

     # Sign the update file
     cargo tauri signer sign \
       --private-key "$TAURI_SIGNING_PRIVATE_KEY" \
       src-tauri/target/universal-apple-darwin/release/bundle/macos/*.tar.gz

     # Upload to your server
     scp src-tauri/target/universal-apple-darwin/release/bundle/macos/*.tar.gz \
        user@server:/var/www/updates/
     scp src-tauri/target/universal-apple-darwin/release/bundle/macos/*.sig \
        user@server:/var/www/updates/
     ```

  ### Manual Update Check
  Users can manually check for updates in:
  - **App Settings** → "Check for Updates" button
  - Or wait for automatic check on startup

  ### Troubleshooting
  | Issue | Solution |
  |-------|----------|
  | "No updates available" | Verify `latestVersion` > `currentVersion` in server endpoint |
  | Signature verification fails | Ensure public/private key pair matches |
  | Update downloads but doesn't install | Check macOS Gatekeeper; app needs proper entitlements |
  | Auto-check not working | Verify `initAutoUpdate()` is called in layout |

### Environment Variable Checklist
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `JWT_SECRET` - Strong random string
- ✅ `ADMIN_EMAIL` & `ADMIN_PASSWORD` - Non-default credentials
- ✅ `APP_URL` - Public application URL
- ✅ `APP_DOMAIN` - Application domain
- ✅ `REDIS_URL` - Redis connection (recommended)
- ✅ `APP_ENV` - Set to `production`
- Optional: SSO provider credentials

## Security Notes

### Authentication & Access Control
- Do not commit `.env` files or secrets to version control
- Use strong values for `JWT_SECRET` in production (minimum 32 characters)
- Replace default admin credentials (`admin@mock.com` / `admin123`) before deployment
- Configure SSO providers with proper redirect URIs matching your `APP_URL`
- Workspace share tokens should be treated as sensitive - revoke when no longer needed

### Data Security
- All API routes under `/api/admin` require authentication
- Shared workspace access is controlled via token validation
- Environment variables are encrypted at rest (configure encryption in production)
- Request history and usage analytics are user/workspace scoped

### Network Security
- Enable HTTPS in production deployments
- Configure proper CORS settings if needed
- Use reverse proxy (Nginx/Traefik) for production deployments
- Set appropriate rate limits for API endpoints

### Database Security
- Use connection pooling for production deployments
- Configure PostgreSQL with proper access controls
- Regular backups of database and Redis data
- Monitor database performance and usage

## Deployment Notes

### Docker Deployment
- Docker and compose templates are included:
  - `Dockerfile` - Production-ready container
  - `docker-compose.yml` - Basic deployment
  - `docker-compose.deployment.nginx.yml` - Nginx reverse proxy setup
  - `docker-compose.deployment.traefik.yml` - Traefik reverse proxy setup
- Configure replicas via `COMPOSE_REPLICAS` env var
- Set public port via `COMPOSE_PUBLIC_PORT`

### Production Requirements
- Use Redis for storage (`REDIS_URL` required for multi-instance deployments)
- Configure strong `JWT_SECRET` (minimum 32 characters)
- Change default admin credentials before deployment
- Set proper `APP_URL` for OAuth callbacks
- Configure `APP_DOMAIN` for proper cookie handling
- Enable HTTPS in production

## Public Routes

### Authentication
- `/login` - Login page (credentials + configured SSO providers)

### Documentation
- `/docs/:slug` - Public OpenAPI documentation from imported specs
- `/docs-static/:slug` - Public markdown documentation pages

### Mock Endpoints
- `/c/:collection/:path` - Collection-based mock endpoint route

### Shared Workspaces
- `/shared-workspace/:token` - Access shared workspace via share token

### Admin Panel
- `/admin` - Main admin dashboard
- `/admin/:id` - Workspace-specific admin panel
- `/admin/create` - Create new workspace
- `/admin/super-admin` - Super admin management panel
- `/admin/super-usage` - Usage analytics dashboard
- `/admin/sso` - SSO provider configuration
- `/admin/definitions` - API definitions management
- `/admin/environments` - Environment management

## API Endpoints Overview

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout current session
- `GET /api/auth/check` - Check authentication status
- `GET /api/auth/sso/providers` - List available SSO providers
- `GET /api/auth/sso/:provider/login` - Initiate SSO login
- `GET /api/auth/sso/:provider/callback` - SSO callback handler

### Admin Operations
- `GET /api/admin/tree` - Get workspace tree structure
- `GET /api/admin/workspaces` - List all workspaces
- `POST /api/admin/workspaces` - Create new workspace
- `GET /api/admin/requests/:id` - Get request details
- `PUT /api/admin/requests/:id` - Update request
- `POST /api/admin/folders/:id/requests` - Create request in folder
- `GET /api/admin/collections` - List collections
- `POST /api/admin/collections` - Create collection
- `GET /api/admin/environments/:id` - Get environment details
- `PUT /api/admin/environments/:id/activate` - Activate environment
- `GET /api/admin/mocks` - List mock configurations
- `POST /api/admin/mocks` - Create mock configuration

### Proxy & Execution
- `POST /api/proxy/request` - Execute HTTP request through proxy
- `POST /api/scripts/execute` - Execute pre/post request scripts

### Definitions & Import
- `POST /api/definitions/import` - Import OpenAPI definition
- `POST /api/definitions/import/postman` - Import Postman collection
- `GET /api/definitions/:id` - Get API definition
- `POST /api/definitions/:id/generate-mocks` - Generate mocks from definition

### History & Analytics
- `GET /api/history` - List request history
- `GET /api/history/:id` - Get history entry details
- `DELETE /api/history/:id` - Delete history entry
- `POST /api/history/log` - Log request execution

### Feedback
- `GET /api/feedback/status` - Check feedback form status (public)
- `POST /api/feedback/submit` - Submit feedback (authenticated)

### Super Admin
- `GET /api/admin/super/check` - Check super admin status
- `GET /api/admin/super/usage/overview` - Usage overview stats
- `GET /api/admin/super/usage/users` - User usage statistics
- `GET /api/admin/super/usage/workspaces` - Workspace usage statistics
- `GET /api/admin/super/usage/trends` - Usage trends
- `GET /api/admin/super/feedback/config` - Get feedback configuration
- `POST /api/admin/super/feedback/config` - Update feedback configuration
- `GET /api/admin/super/feedback/submissions` - List feedback submissions

### Shared Workspace
- `GET /api/shared-workspace/:token` - Get shared workspace details
- `GET /api/shared-workspace/:token/environments/:id/variables` - Get environment variables
- `POST /api/shared-workspace/:token/requests` - Create request (edit permission)
- `PUT /api/shared-workspace/:token/requests/:id` - Update request (edit permission)

## Database Schema

The application uses PostgreSQL with Drizzle ORM. Key tables include:

### Core Tables
- `workspaces` - User workspaces
- `projects` - Projects within workspaces
- `collections` - API collections
- `folders` - Folder organization within collections
- `saved_requests` - Saved API requests
- `request_examples` - Multiple examples per request
- `request_history` - Request execution history
- `environments` - Environment configurations
- `environment_variables` - Environment-specific variables
- `mocks` - Mock endpoint configurations
- `api_definitions` - Imported OpenAPI/Postman definitions

### Collaboration Tables
- `workspace_shares` - Shareable workspace links
- `workspace_members` - Workspace member management
- `workspace_access` - Access control records

### Analytics Tables
- `usage_events` - Individual usage events
- `daily_usage_stats` - Aggregated daily statistics

### Feedback Tables
- `feedback_config` - Feedback form configuration
- `feedback_submissions` - User feedback submissions

### Settings Tables
- `settings` - Application settings
- `sso_providers` - SSO provider configurations

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation for API changes
- Ensure all migrations are reversible
- Test with both Redis and filesystem storage

## License

This project is licensed under the MIT License. See `LICENSE` for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

**Version**: 0.5.8
**Last Updated**: 2025
**Maintained by**: Development Team