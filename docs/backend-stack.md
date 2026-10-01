# Backend Stack

The backend is a TypeScript Express API in `backend/`. It is the **only**
client of Supabase's database and storage. The frontend talks to Supabase
solely for Google sign-in (Auth), never for data. Express holds the Supabase
secret (service-role) key, which bypasses Row Level Security, so it must never
be exposed to the browser.

```
Visitor / Admin ──► Frontend (Vite + React, Vercel)
                         │  fetch('/api/...')
                         ▼
                    Express API (Vercel serverless)
                         │  @supabase/supabase-js (secret key)
                         ▼
                    Supabase ── Postgres
                             └─ Storage ('photos' bucket, public read)
```

## Stack at a glance

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 24 (LTS) + TypeScript 6 | Strict mode, config extends `@tsconfig/node-lts` |
| Framework | Express 5 | Written with `import`/`export`, compiled to CommonJS |
| Database + storage | Supabase (`@supabase/supabase-js`) | One client for Postgres queries **and** Storage |
| Auth | Supabase Auth (Google sign-in) | Browser signs in with Google; backend verifies the access token and checks the `ADMIN_EMAILS` allowlist |
| Captcha | Cloudflare Turnstile | Server-side verification of the public registration form (`lib/turnstile.ts`) |
| Uploads | `multer` (in-memory) | Multipart photos → Supabase Storage, stored with a one-year `cacheControl` |
| Middleware | `cors`, `morgan` | CORS allows `FRONTEND_URL`, `*.vercel.app` (preview deploys), and `http://localhost:*` |
| Dev runner | `tsx watch` | Auto-restarts on file changes |

## Directory layout

```
backend/
├── tsconfig.json           # Strict TS, src/ → dist/
├── vercel.json             # Builds src/index.ts with @vercel/node
├── .env.example            # Template for required env vars
├── .env                    # Your local values (git-ignored, never commit)
├── scripts/                # One-off scripts, run with `npx tsx`
│   ├── seed-storage.ts               # Uploads sample images to the LOCAL photos bucket
│   └── optimize-storage-images.ts    # Resizes and re-caches existing images in the photos bucket
└── src/
    ├── index.ts            # App entry: env checks, middleware, route mounting
    ├── types.ts            # Shared row/request types
    ├── db/supabase.ts      # Two Supabase clients: secret-key (data) + anon-key (token verification)
    ├── middleware/auth.ts  # authenticateAdmin: verifies the Supabase token + ADMIN_EMAILS allowlist
    ├── lib/
    │   ├── registrationOptions.ts  # Age range, level-of-study/country/demographic/major lists (mirrored in frontend)
    │   ├── schools.ts              # MLH-verified school list (mirrored in frontend)
    │   ├── scheduleColors.ts       # Schedule event-type color palette (mirrored in frontend)
    │   └── turnstile.ts            # Cloudflare Turnstile server-side verification
    └── routes/
        ├── auth.ts         # GET /api/auth/me: identity for the dashboard header
        ├── schedule.ts     # /api/schedule + /days + /types
        ├── gallery.ts      # /api/gallery (years, photos, uploads, replace, reorder)
        ├── team.ts         # /api/team (members, photo/badge uploads, reorder)
        ├── judges.ts       # /api/judges (judges, photo upload, reorder)
        ├── companies.ts    # /api/companies (team badges, logo upload, reorder)
        ├── sponsors.ts     # /api/sponsors (tiers, logo upload, reorder)
        ├── settings.ts     # /api/settings (site settings key/value store)
        └── registrations.ts  # /api/registrations (public submit + admin reads/export)
```

The database schema lives in `supabase/migrations/` (see
[Migrations and schema changes](#migrations-and-schema-changes)).

For how the backend fits with the frontend, storage, and auth, see
[architecture.md](architecture.md). For first-time setup, see
[getting-started.md](getting-started.md).

## API surface

- `GET /api/health`: health check
- `GET /api/auth/me`: admin only; returns the signed-in admin's email, name,
  and avatar for the dashboard header
- `GET /api/schedule`, `GET /api/schedule/days`, `GET /api/schedule/types`:
  public reads. Each event's `color` is its event type's color (joined from
  `schedule_event_types`); the legacy `schedule_events.color` column is only
  the fallback for rows without a `type_id`
- `POST/PUT/DELETE /api/schedule/...`: admin only. Events are written with a
  `type_id`; `/api/schedule/types` manages the types (422 for a color outside
  the palette in `src/lib/scheduleColors.ts`, 409 when deleting a type that
  events still use)
- `GET /api/gallery`: public; year/photo writes, uploads, replaces, and
  `PUT /api/gallery/photos/reorder` admin only
- `GET /api/team`: public; member writes, photo/badge uploads, and
  `PUT /api/team/reorder` (display priority) admin only
- `GET /api/judges`: public; a leaner copy of the team routes (photo only,
  no character badge or social links). Judge writes, photo upload, and
  `PUT /api/judges/reorder` admin only. Whether the public site shows judges
  is the `judges_revealed` site setting, which the frontend checks; the
  endpoint itself always returns them
- `GET /api/companies`: public; a row is a reusable logo badge worn by team
  members and judges. CRUD with logo upload and `PUT /api/companies/reorder`
  admin only
- `GET /api/sponsors`: public; sponsors live in their own table, separate
  from badge companies, and every row has a tier. CRUD with logo upload and
  `PUT /api/sponsors/reorder` (tier display order) admin only. New logos go
  to `sponsors/` in the bucket, and deletes only remove files from that
  folder — sponsors carried over by the split migration still point at
  `companies/` files that may also back a team badge
- `GET /api/settings`: public read of all site settings as a flat
  `{ key: value }` map (the keys are listed in
  [architecture.md](architecture.md#site-settings));
  `PUT /api/settings/:key` admin only. The write is an upsert, because
  migrations do not seed this table and a setting has no row until an admin
  first saves it. `location_url` only accepts `http(s)` links
- `POST /api/registrations`: **the only public write endpoint.** JSON body.
  Validates the MLH-required fields (name, email, phone, age, school from
  the MLH list, level of study, ISO 3166-1 country, MLH agreements), the
  demographic questions (gender, optional pronouns, race/ethnicity, sexual
  orientation, major; allowlisted options, with the typed text stored in
  place of any "self-describe"/"other" choice), optional dietary
  restrictions and LinkedIn URL (normalized to https://, must be
  linkedin.com), plus the required resume link (a drive.google.com or
  docs.google.com URL, normalized to https://; the form instructs applicants
  to enable "anyone with the link" sharing, which the server cannot verify),
  then applies the abuse gauntlet: honeypot field, per-IP rate limit,
  Turnstile captcha, and the `registration_open` setting (closed unless
  explicitly opened). Duplicate email → 409.
- `GET /api/registrations` (+ `?search=`), `GET /api/registrations/export`
  (CSV download, resume links included), `DELETE /api/registrations/:id`,
  `DELETE /api/registrations` (wipes every application for the next cycle):
  admin only; the table holds student PII, so there are no public reads

### Conventions shared by every route

- **Status codes:** 422 for a failed validation, 409 for a duplicate or a
  delete blocked by a reference, 404 for a missing row, 204 for a successful
  delete or reorder. Supabase errors are logged server-side and returned as
  a generic 500 message.
- **Caching:** public GET routes send
  `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` so
  Vercel's CDN can serve them. `/api/settings` uses `s-maxage=60` because it
  carries the registration toggle.
- **Route order:** `PUT /<resource>/reorder` is registered before
  `PUT /<resource>/:id`, otherwise Express would treat "reorder" as an id.
- **Uploads:** each route writes to its own folder in the `photos` bucket
  with a random UUID filename and stores the public URL in the row. When
  creating a row, a failed insert deletes the file that was just uploaded.
  Deleting a row or replacing its image removes the old file.

### Admin authentication

"Admin only" routes use the `authenticateAdmin` middleware. Sign-in itself
happens in the browser against Supabase Auth (Google provider); the middleware
verifies the `Authorization: Bearer <token>` header by asking Supabase who the
token belongs to, then checks that email against the `ADMIN_EMAILS`
allowlist. A valid Google sign-in alone grants nothing; the allowlist is the
actual gate. Valid token but not allowlisted → 403 (not 401, so the frontend
shows "not authorized" instead of looping through login).

## Environment variables

`src/index.ts` validates these at boot and **exits immediately** if any is
missing. Copy the template and fill it in:

```bash
cd backend
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `PORT` | Local port (optional, defaults to 3000) |
| `FRONTEND_URL` | CORS allowlist origin, e.g. `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL (local or cloud) |
| `SUPABASE_SECRET_KEY` | Supabase secret / service-role key, server-side only |
| `SUPABASE_ANON_KEY` | Publishable (anon) key, used only to verify admin access tokens |
| `ADMIN_EMAILS` | Comma-separated Google accounts allowed into the admin dashboard |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret for the registration captcha. Optional locally (verification is skipped, loudly); **required in production** or the captcha is decorative |

## Running locally

```bash
cd backend
npm install
npm run dev          # tsx watch: restarts on save, serves http://localhost:3000
```

Other scripts:

```bash
npm run build        # tsc → dist/
npm start            # run the compiled build (node dist/index.js)
```

Sanity check once it's up:

```bash
curl http://localhost:3000/api/health     # → {"status":"ok"}
```

## Supabase for local testing

The repo has a Supabase CLI project configured in `supabase/`
(`config.toml`, `migrations/`). This runs a full local Supabase stack in
Docker so you can develop and test without touching the shared cloud project.

### One-time setup

[getting-started.md](getting-started.md) walks through this step by step,
including installing Docker and Node.js. In short:

1. Install **Docker Desktop** and make sure it's running.
2. Run the Supabase CLI through `npx`, which needs no install:

   ```bash
   npx supabase --version
   ```

   Installing it is optional and saves the `npx` prefix:

   ```bash
   brew install supabase/tap/supabase     # macOS and Linux (Homebrew)
   ```

   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase                 # Windows (Scoop)
   ```

   `npx supabase` always resolves the latest CLI, while an installed copy
   stays at its version until you upgrade it.

### Daily workflow

```bash
# From the repo root (where supabase/config.toml lives)
npx supabase start        # boots Postgres, API, Studio in Docker (slow first time)
npx supabase status       # prints URLs and keys any time you need them
```

`supabase start` prints (and `status` re-prints) everything you need:

- **API URL** → `http://127.0.0.1:54321`, use as `SUPABASE_URL`
- **Secret key** (`service_role key` in older CLI versions) → use as
  `SUPABASE_SECRET_KEY`
- **Publishable key** (`anon key` in older CLI versions) → use as
  `SUPABASE_ANON_KEY`, and as `VITE_SUPABASE_ANON_KEY` in the frontend
- **Studio** → `http://127.0.0.1:54323`, web UI to browse tables and storage
- **DB** → `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Point `backend/.env` at those values and start the backend as usual. To
switch back to the cloud project, just change the two env vars back. No code
changes needed.

```bash
npx supabase stop         # shut the stack down (data persists)
npx supabase stop --no-backup   # shut down AND wipe local data
```

### Sample data

`supabase/seeds/dummy.sql` holds fake content for every table, safe to
commit and share. `db reset` loads whatever is at `supabase/seed.sql` (see
`[db.seed]` in `config.toml`), which is git-ignored, so copy the sample data
there:

```bash
cp supabase/seeds/dummy.sql supabase/seed.sql
npx supabase db reset                       # wipes local data, then loads the seed
cd backend && npx tsx scripts/seed-storage.ts
```

The last command uploads the images the sample rows point at. SQL can only
insert rows, not files, and `db reset` clears storage, so run it after every
reset. It refuses to run unless `SUPABASE_URL` is local.

To work against a snapshot of production data instead, see
[Pulling production data](testing-and-github.md#pulling-production-data-into-your-local-database).

### Migrations and schema changes

`supabase/migrations/*.sql` is the single source of truth for the database
schema: ordered, timestamped SQL files that the CLI applies in sequence. The
repo is linked to the production Supabase project, so the same files define
local and production. Read them in order to understand the schema; each one
is commented.

For local testing:

```bash
npx supabase db reset     # rebuild local DB from scratch: applies all migrations
```

To change the schema:

```bash
npx supabase migration new add_some_table    # creates a timestamped file in supabase/migrations/
# write your SQL in the new file, then:
npx supabase db reset                        # verify it applies cleanly locally
```

Follow the existing pattern: enable RLS on every table with a public-read
policy and a service-role full-access policy. Tables holding PII (like
`registrations`) get **no** public-read policy; see
`supabase/migrations/20260807221653_registrations.sql` for that pattern.

To deploy a migration to production, push it with the CLI after it applies
cleanly locally:

```bash
npx supabase db push      # applies pending migrations to the linked cloud project
```

## Installing and updating packages

Same rules as the frontend, but inside `backend/`:

```bash
cd backend
npm install <package>                     # runtime dependency
npm install -D @types/<package>          # most backend deps need a types package too
npm outdated && npm update                # update within semver ranges
```

After changes, confirm `npm run dev` boots and `npm run build` compiles
cleanly (TypeScript strict mode will catch type breakage), then commit
`package.json` + `package-lock.json` together.

## Storage images and cache headers

Public images are served straight from Supabase storage, so their size and
cacheability decide how much egress the site uses (the free plan includes
5 GB of cached egress per month). Two things keep that down:

- **Size.** The admin resizes every upload to its display size and
  re-encodes it as WebP before sending (`compressImage` in
  `frontend/src/lib/api.ts`): 512px on the longest edge for headshots,
  badges and logos, 1600px for gallery photos. SVGs are sent as-is.
- **Caching.** Uploaded files get random UUID names, so the content behind
  a URL never changes. Every upload route therefore passes a one-year
  `cacheControl` (`IMMUTABLE_CACHE` in `db/supabase.ts`), letting browsers
  cache images instead of re-requesting them on every mount.

Objects uploaded before either of these existed (or through the Supabase
dashboard, which stores `no-cache`) are fixed by
`scripts/optimize-storage-images.ts`. It resizes oversized images to WebP
in place (same path, so DB URLs stay valid) and re-uploads everything in
the `photos` bucket with the one-year cache. Run it once per environment:

```bash
cd backend
npx tsx scripts/optimize-storage-images.ts --dry-run   # report sizes only
npx tsx scripts/optimize-storage-images.ts             # uses SUPABASE_* from .env or the shell
```

## Deployment

The backend deploys to Vercel as its own project. `backend/vercel.json`
builds `src/index.ts` with `@vercel/node` and routes everything to it. Two
things make this work:

- `src/index.ts` ends with `export default app` so Vercel can wrap Express as
  a serverless function (the `app.listen()` call still works locally).
- All env vars from the table above are set in the Vercel project settings,
  with `FRONTEND_URL` pointing at the deployed frontend origin and the
  Supabase vars pointing at the cloud project.

Known constraint: Vercel caps request bodies at **4.5 MB**, which is why the
frontend resizes and compresses images before uploading.
