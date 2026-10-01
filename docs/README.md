# Hack Knight Documentation

The Hack Knight website: a Vite + React frontend and an
Express + Supabase backend, both deployed on Vercel.

## Start here

New to the project? Read [getting-started.md](getting-started.md) first. It
assumes nothing is installed and ends with the site running on your machine.

| Doc | What it covers |
|---|---|
| [getting-started.md](getting-started.md) | First-time setup: installing Git, Node.js, and Docker, running the full stack with sample data, troubleshooting |
| [architecture.md](architecture.md) | How the frontend, backend, database, storage, and auth connect: request flows, caching, data model, what must change together |
| [frontend-stack.md](frontend-stack.md) | React/Vite/Tailwind stack, running the dev server, env vars, installing & updating packages, conventions |
| [backend-stack.md](backend-stack.md) | Express/TypeScript/Supabase stack, env setup, **running Supabase locally**, migrations, deployment |
| [testing-and-github.md](testing-and-github.md) | How to verify changes before pushing, branch/commit/PR workflow, hard rules |
| [external-services.md](external-services.md) | Supabase, Google OAuth, Cloudflare Turnstile, Vercel: keys, local vs production setup, preview deploys |
| [MASTER.md](MASTER.md) | Design system: tokens, typography, motion rules, and the admin ("backstage") component kit |

## Quick start (full local stack)

The short version, for people who already have Git, Node.js 22.12 or newer,
and Docker. Every step is explained in
[getting-started.md](getting-started.md).

```bash
# 1. Local Supabase (needs Docker Desktop running), from the repo root
npx supabase start                 # note the printed Secret and Publishable keys

# 2. Env files: fill in the values listed in getting-started.md, step 6
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Sample data (db reset wipes your local database)
cp supabase/seeds/dummy.sql supabase/seed.sql
npx supabase db reset
(cd backend && npm install && npx tsx scripts/seed-storage.ts)

# 4. Backend
cd backend
npm run dev                        # http://localhost:3000

# 5. Frontend (new terminal)
cd frontend
npm install
npm run dev                        # http://localhost:5173
```
