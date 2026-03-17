# Facebook Page Comment Bot Manager

Production-ready admin dashboard and worker for managing a Facebook Page comment bot with Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, custom JWT auth, and Railway deployment support.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Custom JWT auth with secure httpOnly cookie
- Background worker process for Facebook comment polling
- Zod validation
- bcrypt password hashing
## Features

- Login page at /login
- Protected dashboard at /dashboard
- Save, start, stop, and test bot controls
- PostgreSQL-backed bot settings, processed comments, and logs
- Duplicate protection with unique commentId
- Keyword filtering and all-post or single-post modes
- Optional private reply attempt behind a feature flag
## Required Environment Variables

- DATABASE_URL
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD
- NEXT_PUBLIC_APP_URL
- OPTIONAL_WORKER_ENABLED
- SESSION_COOKIE_SECURE
- FACEBOOK_GRAPH_VERSION
- ENABLE_PRIVATE_MESSAGE_FEATURE
## Local Setup

1. Install dependencies.
2. Copy .env.example to .env and fill in real values.
3. Generate the Prisma client.
4. Run Prisma migrations.
5. Seed the first admin user.
6. Start the Next.js app.
Commands:

npm install
npm run prisma:generate
npm run prisma:migrate:dev -- --name init
npm run prisma:seed
npm run dev
Open http://localhost:3000/login after the app starts.

## Prisma Notes

- Production migration command: npx prisma migrate deploy
- Generate client any time schema changes with: npm run prisma:generate
- Seed command uses ADMIN_EMAIL and ADMIN_PASSWORD from the environment
## Worker Behavior

- The worker reads the latest saved BotSettings row every cycle.
- If isEnabled is false, it sleeps and does nothing.
- If isEnabled is true, it reads posts, fetches comments, filters by keywords, skips duplicates, and replies.
- Processed comment IDs are stored in the database so comments are never replied to twice.
- Logs are written to the database and printed to the console.
Run the worker locally in a second terminal:

npm run worker

## Railway Deployment

Recommended setup: one Railway web service plus one Railway worker service from the same repo.
Web service:

- Build command: npm install && npm run prisma:generate && npm run build
- Start command: npm run start
- Set all environment variables
- Attach a Railway PostgreSQL database and copy its connection string into DATABASE_URL
Worker service:

- Use the same repository and environment variables
- Build command: npm install && npm run prisma:generate
- Start command: npm run worker
- Keep OPTIONAL_WORKER_ENABLED set to true
- Run migrations once before starting the worker service
Suggested Railway order:

1. Create PostgreSQL service.
2. Create the web service from this repo.
3. Add the required variables to the web service.
4. Run npx prisma migrate deploy once.
5. Run npm run prisma:seed once.
6. Create the worker service from the same repo.
7. Reuse the same environment variables for the worker.
## Security Notes

- Admin credentials are only read from environment variables during seeding.
- Passwords are hashed with bcrypt before storage.
- Session data is stored in an httpOnly signed cookie.
- Page access tokens are never hardcoded in source code.
- The dashboard never returns the saved page access token back to the client.
## Production Notes

- Private replies are best-effort only and depend on Facebook permissions and API support.
- A separate worker service is recommended over running the worker inside next start.
- Set SESSION_COOKIE_SECURE=true in production.
- Keep all secrets in Railway environment variables, not in source files.

## Railway Deployment Guide

Recommended architecture: keep the Next.js web app and the long-running bot worker as two separate Railway services. This is cleaner and safer than trying to keep a background loop inside the web server process.

1. Create a new Railway project.
2. Add a PostgreSQL service inside the project.
3. Create a web service from this repository.
4. Add environment variables to the web service: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, NEXT_PUBLIC_APP_URL, OPTIONAL_WORKER_ENABLED=true, SESSION_COOKIE_SECURE=true, FACEBOOK_GRAPH_VERSION, ENABLE_PRIVATE_MESSAGE_FEATURE.
5. Set the web build command to: npm install && npm run prisma:generate && npm run build
6. Set the web start command to: npm run start
7. After the first deploy, run: npx prisma migrate deploy
8. After migrations finish, run: npm run prisma:seed
9. Create a second Railway service from the same repository for the worker.
10. Reuse the same environment variables on the worker service.
11. Set the worker build command to: npm install && npm run prisma:generate
12. Set the worker start command to: npm run worker
13. Keep the worker as a single replica unless you intentionally redesign locking and throughput.
14. Use the health endpoint at /api/health to monitor the web service.
15. Use the bot status endpoint at /api/bot/status from the admin dashboard session to inspect runtime state.
