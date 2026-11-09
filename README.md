# Study Progress Tracker with Prerequisite Rules

Full-stack study tracker. Learners set goals, break them into topics, link topics with prerequisites, log study sessions and see progress. Mentors review learner progress and configure study-session rules.

## Features
- JWT authentication with two roles: **LEARNER** and **MENTOR** (enforced on the backend with `JwtAuthGuard` + `RolesGuard`)
- Goals, topics and prerequisite links (no self-prerequisite, no cycles, configurable maximum)
- A topic stays locked until all of its prerequisites are completed; reopening a prerequisite relocks dependents
- Study sessions (date, topic, minutes, optional note) with min/max minutes and no future dates
- Progress dashboard (goals, completed topics, study time, percentage, chart)
- AI Coach recommendations (next topic, progress, suggested daily target)
- Mentor: view all learners and their goals/topics/progress/sessions (read-only), edit settings

## Tech stack
Angular 21 (standalone components) · NestJS · PostgreSQL · Prisma · JWT · REST

## Architecture
```
frontend/  Angular SPA  (http://localhost:4200)
backend/   NestJS REST API (http://localhost:3000)
           auth, goals, topics, sessions, ai-coach, settings, prisma modules
database   PostgreSQL via Prisma (backend/prisma/schema.prisma)
```

## Database design
`User(role)` 1—N `Goal` 1—N `Topic` · `Topic` N—N `Topic` through `TopicPrerequisite` · `Topic` 1—N `StudySession` · `AppSetting` (single row, id = 1).
Deleting a goal cascades to its topics, prerequisite links and sessions.

## Setup
1. Create a PostgreSQL database.
2. Backend:
```powershell
cd backend
npm.cmd install
# create backend/.env  (see below)
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npx.cmd prisma db seed      # or: npx.cmd tsx src/prisma/seed.ts
npm.cmd run start:dev
```
3. Frontend:
```powershell
cd frontend
npm.cmd install
npm.cmd start
```

### Environment variables (`backend/.env`)
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DBNAME"
JWT_SECRET="a-long-random-secret"
PORT=3000
```
Never commit `.env`.

## Demo logins (after seeding)
| Role | Email | Password |
|---|---|---|
| Learner | learner@demo.com | Demo@12345 |
| Mentor | mentor@demo.com | Demo@12345 |

## API endpoints
| Method | Path | Role |
|---|---|---|
| POST | /auth/register, /auth/login | public |
| GET | /auth/profile | any |
| POST / GET | /goals | learner |
| DELETE | /goals/:id | learner (own goal) |
| GET | /goals/mentor/learners | mentor |
| GET | /goals/mentor/learner/:learnerId | mentor |
| POST / GET | /topics/:goalId | learner create; learner (own) or mentor view |
| POST | /topics/:topicId/prerequisites | learner |
| PATCH | /topics/:topicId/completion | learner |
| POST / GET | /sessions | learner |
| GET | /sessions/progress/:goalId | learner |
| GET | /ai-coach/recommendations | learner |
| GET / PATCH | /settings | mentor |

## Testing
Jest needs Node 24.9+ (Nest 12 packages are ESM).
```powershell
cd backend
npm.cmd test
```
Includes HTTP-level role tests (mentor vs learner, 401/403), prerequisite rules, session validation and settings validation.
