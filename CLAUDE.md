# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The website for Hack Knight (the Queens College hackathon): a public site, a participant registration form, and an admin dashboard. Three folders, three runtimes:

- `frontend/`: Vite + React 19 + TypeScript SPA (public site and admin), Tailwind v4
- `backend/`: Express 5 + TypeScript API, deployed as a Vercel serverless function
- `supabase/`: Supabase CLI project (Postgres migrations, local stack config, seeds)

`frontend/` and `backend/` are separate npm projects with their own `package.json` and lockfile. There is no root `package.json`; run npm inside the folder you are working on.

## Commands

```bash
# Local Supabase (repo root, needs Docker running)
npx supabase start                    # boot the stack; no-op if already up
npx supabase status                   # print URLs and keys
npx supabase migration list --local   # blank right-hand column = not applied
npx supabase migration up --local     # apply pending migrations, keeps data
npx supabase db reset                 # DESTRUCTIVE: wipes local data, replays migrations + seed
npx supabase migration new <name>     # create a migration file

# Backend (cd backend)
npm run dev                           # tsx watch, http://localhost:3000
npm run build                         # tsc; this is the backend's typecheck
npx tsx scripts/seed-storage.ts       # upload sample images to the LOCAL photos bucket

# Frontend (cd frontend)
npm run dev                           # http://localhost:5173
npm run lint                          # eslint
npm run build                         # tsc -b && vite build
```

There is no test framework and no test script. The bar before pushing is: `npm run lint` and `npm run build` in `frontend/`, `npm run build` in `backend/`, then exercising the change by hand (curl for routes, browser for UI). See `docs/testing-and-github.md`.

Ask before running `npx supabase db reset` or `npx supabase db push`. The first wipes the developer's local database (which may hold a production snapshot); the second changes production.

## Architecture

```
Browser ──► Frontend (Vite/React, Vercel static)
   │             │ fetch VITE_API_URL/...
   │             ▼
   │        Express API (Vercel serverless) ── secret key ──► Supabase Postgres + Storage
   │
   └── Google sign-in only ──► Supabase Auth
```

The rule everything else follows from: **the backend is the only client of Supabase data and storage.** The frontend touches Supabase for exactly one thing, the admin's Google sign-in. The backend holds the secret key, which bypasses Row Level Security, so RLS is a backstop and the Express routes are the real access control.

`docs/architecture.md` has the full request flows. The parts that are not obvious from any single file:

### Two fetch paths in the frontend

- **Public pages** use hooks in `frontend/src/hooks/` built on `useApiData`. It keeps a module-level cache per API path (60 s stale-while-revalidate), dedupes concurrent requests, and rewrites Supabase storage URLs to same-origin `/photos/...`. Each hook maps `snake_case` rows to `camelCase` types and falls back to static data in `frontend/src/data/` when the API fails or returns nothing. Consequence: **a broken API does not produce a broken page**, it produces placeholder content. Check the network tab before concluding a change works.
- **Admin pages** use `frontend/src/lib/api.ts` (`apiGet`/`apiPost`/`apiPut`/`apiDelete`/`apiUpload`). It attaches the Supabase access token, sends `cache: "no-store"`, signs out on 401, and throws `ForbiddenError` on 403. Admin code works with raw `snake_case` rows plus staging fields.

### Admin auth

A Supabase session only proves someone signed in with Google. `authenticateAdmin` (`backend/src/middleware/auth.ts`) verifies the token with Supabase, then checks the email against `ADMIN_EMAILS`. 401 means no or invalid token (the frontend signs out); 403 means valid token but not allowlisted (the frontend shows "not authorized"). Keep that distinction: returning 401 for a non-admin causes a login loop. An empty allowlist fails closed.

### Admin tabs stage edits, then save in a batch

Each tab keeps a `server*` copy and a `draft*` copy. Edits only change the draft. Staged rows carry underscore-prefixed client-only fields (`_new`, `_file`, `_logoPreview`; see `components/admin/adminTypes.ts`) and new rows get `tmp-*` ids. Saving opens a `DiffModal` listing the changes, applies them one request at a time, then reloads from the server. On a partial failure the remaining draft is discarded. Tabs stay mounted while hidden so drafts survive tab switches, and each reports its unsaved count through `onDirtyChange`.

### Images

All uploads go to one public bucket, `photos`, in per-route folders (`gallery/<yearId>/`, `team/`, `judges/`, `companies/`, `sponsors/`) with random UUID filenames and a one-year `cacheControl`. The browser compresses images to under 1 MB first because Vercel rejects bodies over 4.5 MB. The database stores the full public URL. The public site serves them through `/photos/*`, which `frontend/vercel.json` rewrites to production storage and `vite.config.ts` proxies in dev.

### Registration

`POST /api/registrations` is the only public write endpoint. Checks run cheapest first: honeypot, validation, in-memory per-IP rate limit, Turnstile captcha, the `registration_open` setting, then insert. The frontend mirrors the validation for fast feedback; the backend copy is the one that decides.

## Things that must change together

- **Registration options and school list:** `frontend/src/lib/registrationOptions.ts` and `schools.ts` are mirrored in `backend/src/lib/`. The backend rejects any value missing from its copy.
- **Schedule colors:** `scheduleColors.ts` in both `frontend/src/lib/` and `backend/src/lib/`, the `schedule_event_types.color` CHECK constraint, the `.schedule-event.color-<name>` rule in `frontend/src/styles/components.css`, and the token in `frontend/src/index.css`.
- **A new column or table:** the migration, `backend/src/types.ts`, the route, the hook's row type and mapper, `frontend/src/types.ts`, and the static fallback in `frontend/src/data/` if there is one.
- **A new env var:** the `.env.example`, the docs table, Vercel project settings for both Production and Preview, and (backend, if required) `requiredEnvVars` in `backend/src/index.ts`.

## Conventions and gotchas

- Backend imports use `.js` extensions (`"./routes/auth.js"`) even though the files are `.ts`. Code is written with `import`/`export` but compiles to CommonJS (`backend/package.json` has no `"type": "module"`), so use `__dirname`, not `import.meta`, and no top-level `await`.
- Register `/reorder` routes before `/:id` routes, or Express treats "reorder" as an id.
- Validation failures return 422, duplicates 409, and Supabase errors are logged and returned as a generic 500 message.
- Public GET routes set `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` for Vercel's CDN (`/api/settings` uses 60/120 because it carries the registration toggle).
- CORS is decided in `backend/src/index.ts` only: `FRONTEND_URL`, any `*.vercel.app` origin, and any `http://localhost:*`. Never add `Access-Control-Allow-Origin` to `backend/vercel.json`.
- `site_settings` is a key/value table that migrations deliberately do not seed. A key has no row until an admin saves it, so every reader must treat a missing key as its default. `PUT /api/settings/:key` upserts.
- Postgres `numeric` columns arrive as strings in JSON. Type rows as `number | string` and wrap in `Number()` in the mapper.
- Frontend TypeScript has `verbatimModuleSyntax` (use `import type`) and `noUnusedLocals`/`noUnusedParameters` on.
- Every table has RLS enabled with a public-read policy and a service-role policy. `registrations` holds student PII and has no public-read policy. New tables need explicit grants in the migration.
- Write migrations idempotently (`IF EXISTS` / `IF NOT EXISTS`); they must replay on an empty database.
- `VITE_SUPABASE_URL` must be `http://127.0.0.1:54321` locally, not `localhost`. Seeded image URLs use that exact host, and the `/photos/` rewrite is a string match.

## Design system

`docs/MASTER.md` is the source of truth. The rules that come up most:

- Use the tokens defined in the `@theme` block of `frontend/src/index.css`. No raw hex values elsewhere.
- Admin UI is built from the kit in `components/admin/ui.tsx` and the glyphs in `components/admin/icons.tsx`. Do not inline new SVGs in tabs.
- No emoji as icons, no native `confirm()`/`alert()`, no new dependencies without asking.
- Admin motion: 150 to 250 ms, `ease-brand`, animate only `transform` and `opacity`. No bounce, pulse, or scroll-triggered animation in the admin.

## Git workflow

- Fork and upstream model: `upstream` is `codeforallqc/hack-knight`, `origin` is a personal fork. PRs go from a fork branch into `codeforallqc:main`.
- Never commit to `main` directly. Branch as `<type>/<short-kebab-name>`.
- Conventional Commits: `type(scope): imperative description`. Types in use: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `perf`. Common scopes: `frontend`, `backend`, `admin`, `site`, `api`, `db`, `hooks`, `supabase`.
- Small, single-purpose commits. One concern per PR.
- Never commit `backend/.env`, `frontend/.env.local`, `supabase/.env`, `supabase/seed.sql`, or `supabase/prod_data.sql`. The last two can contain real registrant data.

## Docs

| Doc | Covers |
|---|---|
| `docs/getting-started.md` | First-time setup from a machine with nothing installed |
| `docs/architecture.md` | How the pieces connect: request flows, auth, images, caching, data model |
| `docs/frontend-stack.md` | Frontend layout, env vars, conventions, deployment |
| `docs/backend-stack.md` | API surface, env vars, Supabase workflow, deployment |
| `docs/external-services.md` | Supabase, Google OAuth, Turnstile, Vercel setup |
| `docs/testing-and-github.md` | Verification routines, database routines, git workflow |
| `docs/MASTER.md` | Design system |

Update the matching doc in the same PR when behavior changes; recent history does this with a separate `docs:` commit.
