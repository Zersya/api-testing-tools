# Mock Service (v0.5.8)

A full-stack API workspace for building, testing, mocking, documenting, and sharing APIs.

This project provides a comprehensive web admin panel to manage requests and environments, run HTTP calls through a proxy, generate mock endpoints, import API definitions (OpenAPI/Postman), publish documentation, track usage analytics, and collaborate with team members.

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

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, Tailwind CSS
- **Backend**: Nuxt Nitro server routes + middleware
- **Database**: PostgreSQL + Drizzle ORM + Drizzle migrations
- **Storage**: Redis (optional, recommended for production) or filesystem
- **Authentication**: JWT + SSO providers (Keycloak, Google, GitHub, Azure AD)
- **Utilities**: 
  - `marked` + `highlight.js` for docs rendering
  - `@faker-js/faker` for mock data generation
  - `ioredis` for Redis integration
  - `uuid` for unique identifiers

## Requirements

- Node.js 20+ (recommended)
- npm (or pnpm/yarn/bun)
- PostgreSQL database
- Redis (optional, recommended for production deployments)

## Quick Start

1. **Clone repository**
2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create environment file**

   ```bash
   cp .env.example .env
   ```

4. **Configure required env vars** in `.env`
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

5. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

6. **(Optional) seed default workspace/project**

   ```bash
   npm run db:seed
   ```

7. **Start development server**

   ```bash
   npm run dev
   ```

App runs at `http://localhost:3000`.

## Default Login (from env defaults)

- Email: `admin@mock.com`
- Password: `admin123`

Change these values before any production use.

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

## Project Structure

```text
app/                    # Nuxt app pages/components
  pages/                # Application pages
    admin/              # Admin panel pages
      super-admin.vue   # Super admin management
      super-usage.vue   # Usage analytics dashboard
      sso.vue           # SSO provider management
      definitions/      # API definitions management
      environments/     # Environment management
    shared-workspace/   # Shared workspace access
    docs/               # Public API documentation
    docs-static/        # Public markdown docs
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
```

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

## New Features (v0.5.8)

### Workspace Sharing
- Share workspaces with unique tokens
- Set permissions (view/edit) for shared access
- Configure expiration dates for share links
- Manage active shares from admin panel

### Usage Analytics
- Track all API operations (requests, collections, folders, mocks, environments)
- View daily/weekly/monthly usage statistics
- Monitor user and workspace activity
- Analyze response times and success rates
- Export usage data for reporting

### Feedback System
- Configurable feedback forms (super admin)
- Multiple question types (rating, text, multiple choice)
- Time-window control for feedback collection
- Feedback analytics and submissions review
- Anonymous feedback support

### Magic Variables
- Postman-style dynamic variables support
- `{{$timestamp}}` - Current timestamp
- `{{$guid}}` - Generate UUID
- `{{$randomInt}}` - Random integer
- `{{$randomFirstName}}`, `{{$randomLastName}}` - Random names
- Full faker.js integration for mock data

### Enhanced Request Management
- Multiple request examples per request
- Request history with comparison view
- Environment variable substitution in all fields
- Improved request builder with better UX

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

### Environment Variables Checklist
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

