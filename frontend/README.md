# Study Progress Tracker with Prerequisite Rules

A full-stack web application that helps learners organize study goals, manage topics, track study sessions, and monitor learning progress using prerequisite-based topic unlocking.

## Technology Stack

**Frontend**
- Angular 21
- TypeScript
- HTML and CSS

**Backend**
- NestJS 12
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

**Testing**
- Jest
- NestJS Testing utilities

## Features

- Learner and Mentor roles with server-side authorization.
- JWT-based authentication.
- Create, view, and delete study goals.
- Create and manage topics.
- Define topic prerequisites.
- Prevent self-prerequisites and circular dependencies.
- Lock topics until all prerequisites are completed.
- Display missing prerequisites.
- Relock dependent topics when a completed prerequisite is reopened.
- Record study sessions with date, topic, minutes, and notes.
- Validate study duration and prevent future study dates.
- Track goal progress percentage and total study minutes.
- Dashboard progress charts.
- AI Coach study recommendations.
- Mentor-only application settings.

## Project Structure

```text
Study_Progress_Tracker_New/
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── goals/
│   │   ├── topics/
│   │   ├── sessions/
│   │   ├── settings/
│   │   ├── ai-coach/
│   │   └── prisma/
│   │       └── seed.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
└── README.md
```

## Database Design

PostgreSQL database managed using Prisma ORM.

| Model | Purpose |
|---|---|
| User | User details and roles |
| Goal | Learner study goals |
| Topic | Topics and completion status |
| TopicPrerequisite | Prerequisite relationships |
| StudySession | Study records |
| AppSetting | Application configuration |

### Default Settings

| Setting | Default |
|---|---:|
| Minimum study minutes | 5 |
| Maximum study minutes | 480 |
| Maximum prerequisites | 5 |

## Installation and Setup

### Prerequisites

- Node.js and npm
- PostgreSQL

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Study_Progress_Tracker_New
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
DATABASE_URL="postgresql://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/study_tracker?schema=public"
JWT_SECRET="your-secure-secret"
```

Replace the database username and password with your local PostgreSQL credentials.

Run migrations and generate Prisma Client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Run seed data:

```bash
npx tsx src/prisma/seed.ts
```

Start backend:

```bash
npm run start:dev
```

Backend URL: `http://localhost:3000`

### 3. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm start
```

Open the URL displayed in the terminal, usually `http://localhost:4200`.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Learner | learner@demo.com | Demo@12345 |
| Mentor | mentor@demo.com | Demo@12345 |

These are local demonstration credentials. Do not use them in production.

## Automated Tests

Run backend tests from the backend folder:

```bash
npm test -- --runInBand
```

### Current Test Results

- Test suites passed: 13
- Tests passed: 19
- Failed test suites: 0

Tests cover authentication, controllers, goals, topics, study sessions, settings, and AI Coach modules.

## User Roles

### Learner
- Manage personal study goals and topics.
- Add topic prerequisites.
- Complete eligible topics.
- Record study sessions.
- View learning progress.
- Receive AI Coach recommendations.

### Mentor
- View learner study information.
- Access mentor-only settings.
- Configure study duration and prerequisite limits.

## Future Improvements

- More comprehensive end-to-end testing.
- Advanced learning analytics.
- Improved personalized recommendations.
- Cloud deployment.

---

**Project:** Study Progress Tracker with Prerequisite Rules  
**Architecture:** Angular + NestJS + PostgreSQL + Prisma
