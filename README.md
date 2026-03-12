# Mock Service

A full-stack API workspace for building, testing, mocking, documenting, and sharing APIs.

This project provides a web admin panel to manage requests and environments, run HTTP calls through a proxy, generate mock endpoints, import API definitions (OpenAPI/Postman), and publish documentation.

## Key Features

- Workspace-based API organization (workspaces, projects, collections, folders, requests)
- Request builder with headers, auth, body, scripts, and examples
- HTTP proxy execution with environment variable substitution
- Cloud mock routing via collection-aware endpoints
- OpenAPI/Postman import support
- Public API documentation from imported specs
- Public markdown documentation pages
- Workspace sharing and member-based access control
- Email/password auth + optional SSO providers

## Tech Stack

- **Frontend**: Nuxt 3, Vue 3, Tailwind CSS
- **Backend**: Nuxt Nitro server routes + middleware
- **Database**: PostgreSQL + Drizzle ORM + Drizzle migrations
- **Utilities**: `marked` + `highlight.js` for docs rendering

## Requirements

- Node.js 20+ (recommended)
- npm (or pnpm/yarn/bun)
- PostgreSQL database

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
   - `DATABASE_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`

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
app/                # Nuxt app pages/components
server/             # API routes, middleware, services, db bindings
drizzle/            # SQL migrations
docs/               # Markdown docs served by slug
scripts/            # Utility scripts (including version bump)
```

## Public Routes

- `/login` - Login page (credentials + configured SSO)
- `/docs/:slug` - Public OpenAPI documentation
- `/docs-static/:slug` - Public markdown documentation
- `/c/:collection/:path` - Collection-based mock endpoint route

## Deployment Notes

- Docker and compose templates are included:
  - `Dockerfile`
  - `docker-compose.yml`
  - `docker-compose.deployment.nginx.yml`
  - `docker-compose.deployment.traefik.yml`
- Ensure `.env` is configured correctly in deployment environments, especially `DATABASE_URL`, `JWT_SECRET`, and admin credentials.

## Security Notes

- Do not commit `.env` files or secrets.
- Use strong values for `JWT_SECRET` in production.
- Replace default admin credentials before deployment.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

