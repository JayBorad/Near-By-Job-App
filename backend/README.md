# Job Marketplace Backend

Production-ready TypeScript backend for a Job Marketplace App built with Node.js, Express, Supabase Auth, Prisma ORM, PostgreSQL, and Socket.IO.

## Tech Stack
- Node.js (LTS)
- Express.js
- Supabase Auth
- PostgreSQL (Supabase)
- Prisma ORM
- Socket.IO
- express-validator
- Swagger (OpenAPI)

## Features
- Auth: signup, signin, forgot password, Google OAuth, Apple OAuth
- RBAC: `USER`, `ADMIN`
- User profile management with soft delete
- Category flow with admin approval
- Jobs CRUD with owner-only edit/delete and soft delete
- Nearby jobs using PostGIS geo query (`ST_DWithin`)
- Job applications with accept/reject flow
- Real-time chat (owner <-> accepted applicant)
- Centralized error handling and input validation

## Project Structure

```txt
backend/
  prisma/
    schema.prisma
    migrations/
  src/
    config/
    middleware/
    modules/
      auth/
      user/
      category/
      job/
      application/
      chat/
    routes/
    sockets/
    utils/
    app.ts
  server.ts
  tsconfig.json
  .env.example
```

## 1) Installation (macOS)

```bash
cd backend
npm install
```

## 2) Environment Setup

Copy env file:

```bash
cp .env.example .env
```

Update `.env`:
- `DATABASE_URL`: Supabase **pooler** Postgres connection string (`:6543`, `pgbouncer=true`)
- `DIRECT_URL`: Supabase **direct** Postgres connection string (`:5432`)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `SUPABASE_JWT_AUDIENCE`: usually `authenticated`
- `PORT`, `CLIENT_URL`

## 3) Supabase Setup

1. Create a Supabase project.
2. In Supabase Auth, enable providers:
- Email/Password
- Google
- Apple
3. Configure OAuth redirect URLs for your frontend/backend callback route.
4. Get project URL and keys from Project Settings -> API.
5. Enable PostGIS in DB (migration already includes it):
- `CREATE EXTENSION IF NOT EXISTS postgis;`

## 4) Prisma Setup & Migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

For production deployments:

```bash
npm run prisma:deploy
```

## 5) Run Locally

Development with nodemon:

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

API base URL: `http://localhost:5000/api/v1`
Swagger docs: `http://localhost:5000/api-docs`

## 6) API Testing Quick Guide

1. Create user via `POST /api/v1/auth/signup`
2. Login via `POST /api/v1/auth/signin`
3. Use `accessToken` as `Authorization: Bearer <token>`
4. Test endpoints:
- Users: `/api/v1/users/me`
- Categories: `/api/v1/categories`
- Jobs: `/api/v1/jobs`, `/api/v1/jobs/nearby`
- Applications: `/api/v1/applications`
- Chats: `/api/v1/chats/job/:jobId`

## 7) Socket.IO Usage

Connect with auth token:

```js
const socket = io('http://localhost:5000', {
  auth: { token: '<supabase-access-token>' }
});

socket.emit('join_job_room', { jobId: '<job-uuid>' });
socket.emit('send_message', {
  jobId: '<job-uuid>',
  receiverId: '<user-uuid>',
  message: 'Hello'
}, (ack) => console.log(ack));

socket.on('new_message', console.log);
```

## 8) Production Notes
- Use HTTPS and managed secret storage for env values.
- Restrict CORS to trusted domains.
- Rotate Supabase service role keys periodically.
- Add rate limiting and audit logging for sensitive endpoints.
- Add tests (unit/integration/e2e) in CI/CD.
