# Feedback Feature Implementation Plan

## Goal
Add a feedback collection system where super admins can configure feedback forms with time-based visibility windows, users can submit feedback during active windows, and super admins can view and analyze all submissions.

## Architecture
- Store feedback configuration and submissions in PostgreSQL via Drizzle ORM
- Create RESTful API endpoints under `/api/feedback` for users and `/api/admin/super/feedback` for super admin
- Build Vue components: configuration panel, modal form, analytics dashboard
- Use composable `useFeedback.ts` for state management

## Tech Stack
Nuxt 3, Vue 3, TypeScript, Drizzle ORM, PostgreSQL

---

## Implementation Tasks

### Task 1: Database Schema
Create `server/db/schema/feedback.ts` with tables:
- feedback_config: Stores time window, form settings
- feedback_submissions: Stores user feedback

Run: `npm run db:generate && npm run db:push`

### Task 2: API Endpoints
- `GET /api/feedback/status` - Public status check
- `POST /api/feedback/submit` - Submit feedback
- `GET /api/admin/super/feedback/config` - Get config
- `POST /api/admin/super/feedback/config` - Update config
- `GET /api/admin/super/feedback/submissions` - List submissions with analytics

### Task 3: Frontend Components
- `FeedbackModal.vue` - User feedback form modal
- `FeedbackConfigPanel.vue` - Super admin configuration UI
- `FeedbackAnalytics.vue` - Analytics dashboard
- `useFeedback.ts` - Composable for state management

### Task 4: Integration
- Add Feedback tab to `super-admin.vue`
- Integrate modal into main layout
- Add feedback button to AppHeader

### Task 5: Key Features
- Time-based visibility (shownFrom, shownUntil)
- Custom questions support (rating, text, choice types)
- Session-based submission tracking
- Export to CSV
- Rating distribution charts
- Submissions by workspace

---

## Testing
1. Configure feedback with time window
2. Verify modal appears within window
3. Submit feedback
4. Verify analytics update
5. Test export functionality

## Commands
```bash
npm run db:generate
npm run db:push
npm run dev
```
