# Architecture

How the Hack Knight website fits together: what runs where, how a request
travels through it, and which pieces depend on each other. For setup, see
[getting-started.md](getting-started.md). For per-side detail, see
[frontend-stack.md](frontend-stack.md) and [backend-stack.md](backend-stack.md).

## The pieces

| Piece | What it is | Runs locally at | Runs in production on |
|---|---|---|---|
| Frontend | Vite + React single-page app: public site, registration form, admin dashboard | `http://localhost:5173` | Vercel (static build) |
| Backend | Express API | `http://localhost:3000` | Vercel (serverless function), a separate project from the frontend |
| Database | Postgres, managed by Supabase | `127.0.0.1:54322` (Docker) | Supabase cloud |
| Storage | Supabase Storage, one public bucket named `photos` | `http://127.0.0.1:54321` (Docker) | Supabase cloud |
| Auth | Supabase Auth with the Google provider | `http://127.0.0.1:54321` (Docker) | Supabase cloud |
| Captcha | Cloudflare Turnstile | skipped unless keys are set | Cloudflare |

```
                    ┌──────────────────────────────────────────┐
                    │  Browser                                 │
                    │  React app (public site + admin)         │
                    └───┬───────────────┬──────────────────┬───┘
                        │               │                  │
          data (JSON,   │      images   │    admin Google  │
          uploads)      │      /photos/*│    sign-in only  │
                        ▼               ▼                  ▼
              ┌──────────────────┐  ┌────────────┐  ┌───────────────┐
              │  Express API     │  │ Vercel CDN │  │ Supabase Auth │
              │  /api/...        │  │ (rewrite)  │  └───────┬───────┘
              └───┬──────────┬───┘  └─────┬──────┘          │
       secret key │          │ verify     │                 │
       (data +    │          │ token      │                 │
        storage)  ▼          └────────────┼─────────────────┘
              ┌───────────────────────────▼───┐
              │  Supabase                     │
              │  Postgres  +  Storage(photos) │
              └───────────────────────────────┘
```

## The one rule

**The backend is the only client of the database and storage.** The frontend
never reads or writes a table. It talks to Supabase for exactly one thing: the
admin's Google sign-in.

Why it is built this way:

- The backend holds the Supabase **secret key**, which bypasses Row Level
  Security. That key can never reach a browser, so everything that needs it
  lives behind Express.
- Validation, the admin allowlist, the captcha, and the registration window
  are all enforced in one place. The frontend repeats some checks for fast
  feedback, but the backend copy is the one that decides.
- Row Level Security is still enabled on every table as a backstop. Public
  tables allow anonymous reads; `registrations` (student PII) allows none.

## Request flows

### A visitor loads a public page

1. A component calls a hook, for example `useSchedule()`.
2. The hook calls `useApiData("/schedule")` (`frontend/src/hooks/useApiData.ts`).
3. `useApiData` checks its in-memory cache. A response younger than 60 seconds
   is returned immediately. An older one is returned immediately too, while a
   fresh copy is fetched in the background. Concurrent requests for the same
   path share one fetch.
4. On a cache miss it fetches `VITE_API_URL + "/schedule"`.
5. Express queries Supabase with the secret key and responds with
   `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`, so
   Vercel's CDN can answer the next visitor without running the function.
6. `useApiData` rewrites every Supabase storage URL in the response text to a
   same-origin `/photos/...` path (see [Images](#images)).
7. The hook maps `snake_case` rows to the `camelCase` types in
   `frontend/src/types.ts`.
8. **If the fetch failed or returned an empty list, the hook returns the
   static data in `frontend/src/data/` instead.**

Step 8 means the public site never renders empty, and also that a broken API
is easy to miss: the page looks fine but shows placeholder content. When you
test a change, confirm the request succeeded in the browser's network tab.

| Hook | Endpoint | Fallback when the API fails or is empty |
|---|---|---|
| `useSchedule` | `/schedule`, `/schedule/days` | `data/schedule.ts` |
| `useGallery` | `/gallery` | `data/gallery.ts` |
| `useTeam` | `/team` | `data/team.ts` |
| `useSponsors` | `/sponsors` | `data/sponsors.ts` |
| `useJudges` | `/judges` | none; the section shows "To Be Announced" |
| `useSiteSettings` | `/settings` | each caller supplies its own default |
| `useCountdown` | `/settings` (via `useSiteSettings`) | `DEFAULT_COUNTDOWN_TARGET` |

The FAQ is static only (`data/faq.ts`); there is no FAQ endpoint or admin tab.

### An admin signs in

1. `/admin/login` calls `supabase.auth.signInWithOAuth({ provider: "google" })`.
2. Google redirects back through Supabase Auth to `/admin`. The Supabase
   client stores the session in the browser and refreshes the token in the
   background.
3. The `RequireAuth` guard in `App.tsx` calls `GET /api/auth/me` before
   rendering the dashboard.
4. `authenticateAdmin` (`backend/src/middleware/auth.ts`) reads the
   `Authorization: Bearer <token>` header, asks Supabase who the token
   belongs to, then checks that email against `ADMIN_EMAILS`.

| Result | Status | What the frontend does |
|---|---|---|
| No token, or Supabase rejects it | 401 | Signs out; the guard redirects to the login page |
| Valid token, email not in `ADMIN_EMAILS` | 403 | Shows "not authorized" with a sign-out button |
| `ADMIN_EMAILS` is empty | 500 | Every admin request fails (fails closed) |
| Valid token, email allowlisted | 200 | Renders the dashboard |

**A Google sign-in alone grants nothing.** Anyone with a Google account can
complete step 2. The allowlist in step 4 is the actual gate, and it runs on
every admin request, not only at login.

The backend verifies tokens with a second Supabase client that uses the
publishable (anon) key. Token verification needs no elevated privilege, so
the secret-key client is kept out of that code path.

### An admin edits content

Admin tabs do not save as you type. Each tab stages changes locally and
applies them in one reviewed batch:

1. On mount the tab loads rows through `lib/api.ts` and keeps two copies:
   the server state and a draft.
2. Every edit changes only the draft. New rows get a placeholder id
   (`tmp-1`, `tmp-2`, ...) and a `_new` marker. Selected images are held as
   `File` objects with an object-URL preview.
3. The tab compares draft to server state to build a list of changes and
   reports the count to `AdminPage`, which shows a dot on the tab label.
   A `SaveBar` appears at the bottom.
4. **Save Changes** opens a `DiffModal` listing every add, edit, delete, and
   reorder.
5. On confirm the changes are applied one request at a time, in order.
   Placeholder ids are swapped for the real ids the server returns, so a new
   event can reference a new event type created in the same batch.
6. The tab reloads from the server. If a request failed partway, the
   remaining draft is discarded and the error says how many changes landed.

Tabs stay mounted while hidden, so an unsaved draft survives switching tabs.
It does not survive a page reload.

Admin requests send `cache: "no-store"`. Without it the browser could answer
the post-save reload from its HTTP cache (the public routes send
`stale-while-revalidate`), and the dashboard would show stale data right
after a save.

The Applications tab is the exception to staging: it is read-only apart from
delete, and it fetches through `useRegistrations`.

### An image is uploaded

1. The admin picks a file. `compressImage()` in `lib/api.ts` shrinks it in
   the browser to under 1 MB and at most 1920 px on the long side.
2. On save, `apiUpload()` sends it as `multipart/form-data`.
3. `multer` holds the file in memory. Nothing is written to disk, because
   serverless functions have no persistent filesystem.
4. The route uploads it to the `photos` bucket under a folder for that
   feature, with a random UUID filename and a one-year `cacheControl`.
5. The route stores the file's full public URL in the database row.
6. When creating a row, a failed insert deletes the file that was just
   uploaded. When a row is deleted or its image replaced, the old file is
   removed.

The compression in step 1 is not optional. Vercel rejects request bodies over
4.5 MB.

| Folder in `photos` | Written by |
|---|---|
| `gallery/<yearId>/` | `routes/gallery.ts` |
| `team/` | `routes/team.ts` (photos and character badges) |
| `judges/` | `routes/judges.ts` |
| `companies/` | `routes/companies.ts` |
| `sponsors/` | `routes/sponsors.ts` |
| `seed/` | `backend/scripts/seed-storage.ts` (local sample images only) |

### Someone registers

`POST /api/registrations` is the only public write endpoint, so it carries
all of the abuse handling. Checks run cheapest first:

| # | Check | On failure |
|---|---|---|
| 1 | Honeypot: a hidden `website` field a human never fills in | 200 with nothing written, so a bot cannot tell it was caught |
| 2 | Validation of every field against allowlists | 422 with a message |
| 3 | Rate limit: 5 attempts per IP per 10 minutes | 429 |
| 4 | Turnstile captcha, verified with Cloudflare | 400 |
| 5 | The `registration_open` setting | 403 |
| 6 | Insert; email is unique | 409 on a duplicate |

Things to know:

- The rate limit is held in memory, so it is per serverless instance and
  resets when Vercel recycles one. It slows a naive flood and nothing more.
- Without `TURNSTILE_SECRET_KEY` the backend skips step 4 and logs a warning.
  That is intended for local development and must never happen in production.
- Registration is closed unless `registration_open` is exactly `"true"`. A
  missing row or a failed read counts as closed.
- For "self-describe" and "other" answers the typed text is stored in place
  of the option.

## Images

The database stores full Supabase storage URLs, but the public site does not
load images from Supabase directly. `useApiData` rewrites them:

```
https://<project>.supabase.co/storage/v1/object/public/photos/team/abc.webp
                              becomes
/photos/team/abc.webp
```

`/photos/*` is then served by:

- **Production:** a rewrite in `frontend/vercel.json` to the production
  bucket, with rewrite caching enabled. Visitors get images from Vercel's
  CDN, and Supabase serves each file roughly once per region. This exists
  because the public site was exhausting Supabase's free-plan egress.
- **Local dev:** a proxy in `frontend/vite.config.ts` to
  `VITE_SUPABASE_URL`.

Details that matter when something looks wrong:

- The rewrite is a plain string replacement on the prefix built from
  `VITE_SUPABASE_URL`. A URL with a different host is left untouched. Locally
  that means `VITE_SUPABASE_URL` must be `http://127.0.0.1:54321`, matching
  the host in the seeded URLs, not `http://localhost:54321`.
- The production destination in `vercel.json` is hardcoded, because that file
  cannot read environment variables.
- The admin dashboard fetches through `lib/api.ts`, which does not rewrite,
  so it uses the direct storage URLs.
- Filenames are random UUIDs, so the content behind a URL never changes and
  can be cached for a year.

## Caching layers

Four caches sit between the database and a visitor. When a change does not
show up, work out which one is holding the old value.

| Layer | Where | Lifetime | Applies to |
|---|---|---|---|
| `useApiData` cache | Browser memory | 60 s, then background refresh; cleared on page reload | Public pages |
| Browser HTTP cache | Browser | Follows the API's `Cache-Control` | Public pages (admin sends `no-store`) |
| Vercel CDN | Edge | `s-maxage=300` for most routes, `60` for `/api/settings` | Public GET routes, production only |
| Image cache | Browser and Vercel CDN | One year | Everything under `/photos/` |

`/api/settings` has the short lifetime because it carries the registration
toggle. Even so, opening or closing registration can take a minute or two to
reach a visitor who is already on the site.

## Data model

The schema is defined by the SQL files in `supabase/migrations/`, applied in
timestamp order. There is no ORM.

| Table | Holds | Notes |
|---|---|---|
| `schedule_days` | The three day headers (`fri`, `sat`, `sun`) and their labels | Keyed by `key`, not a UUID |
| `schedule_event_types` | A label plus one color from a fixed palette | Color is limited by a CHECK constraint |
| `schedule_events` | Events with a day, start and end hour, and a type | Hours are `numeric` (`12.5` is 12:30) |
| `gallery_years` | One row per year | |
| `gallery_photos` | Photos belonging to a year | Deleted with their year |
| `companies` | Logo badges worn by team members and judges | Not sponsors |
| `team_members` | Organizers: photo, optional character badge, links, up to two company badges | |
| `judges` | Judges: photo and up to two company badges | |
| `sponsors` | Sponsors with a tier (`platinum`, `gold`, `silver`, `bronze`), link, and blurb | Separate table from `companies` |
| `site_settings` | Key/value pairs | See below |
| `registrations` | Applications | Student PII; no public read policy |

Relationships:

```
gallery_years ──< gallery_photos            delete year  → photos deleted
schedule_event_types ──< schedule_events    delete type  → blocked while events use it (API returns 409)
companies ──< team_members (company1_id, company2_id)   delete company → badge cleared
companies ──< judges       (company1_id, company2_id)   delete company → badge cleared
```

Every content table has a `sort_order` column, which the admin's
drag-to-reorder writes through a `PUT .../reorder` route.

An event's color comes from its type. `schedule_events.color` is a legacy
column kept only as the fallback for rows with no `type_id`.

### Site settings

`site_settings` is a key/value store edited from the admin's Misc and Judges
tabs. All values are strings.

| Key | Values | Default when the row is missing |
|---|---|---|
| `countdown_target` | ISO date-time | `2026-10-09T00:00:00` |
| `registration_open` | `"true"` / `"false"` | closed |
| `registration_closed_mode` | `"coming_soon"` / `"closed"` | `coming_soon` |
| `judges_revealed` | `"true"` / `"false"` | hidden |
| `mlh_badge_enabled` | `"true"` / `"false"` | hidden |
| `mlh_disclaimer_enabled` | `"true"` / `"false"` | shown |
| `sponsors_tba_enabled` | `"true"` / `"false"` | shown |
| `location_name` | text | `Queens College - CUNY` |
| `location_url` | `http(s)` URL, or empty for plain text | a Google Maps search link |

Migrations deliberately do not seed this table, so a setting has no row until
an admin saves it. Every reader must treat a missing key as its default, and
the write route upserts.

The countdown target also drives the hero: once it passes, the timer reads
"Hackathon In-Progress!" and the fireworks start.

## Things that must change together

The frontend and backend are separate projects and share no code, so a few
things are duplicated by hand. Changing one side only will break something.

| When you change | Also change |
|---|---|
| Registration dropdown options | `registrationOptions.ts` in both `frontend/src/lib/` and `backend/src/lib/` |
| The school list | `schools.ts` in both `frontend/src/lib/` and `backend/src/lib/` |
| The schedule color palette | `scheduleColors.ts` on both sides, the CHECK constraint on `schedule_event_types.color` (new migration), the `.schedule-event.color-<name>` rule in `styles/components.css`, and the color token in `index.css` |
| A table's columns | A new migration, `backend/src/types.ts`, the route, the frontend hook's row type and mapper, `frontend/src/types.ts`, and the static fallback in `frontend/src/data/` if one exists |
| The production Supabase project | The hardcoded URL in `frontend/vercel.json` |
| An environment variable | The `.env.example`, the docs table, and the Vercel project settings for both Production and Preview |

## Deployment

One repository, two Vercel projects:

- **Frontend:** `tsc -b && vite build` produces a static bundle.
  `frontend/vercel.json` rewrites `/photos/*` to storage and every other path
  to `index.html`, so React Router handles routing.
- **Backend:** `backend/vercel.json` builds `src/index.ts` with
  `@vercel/node` and routes every request to it. `index.ts` ends with
  `export default app`, which is what lets Vercel wrap Express as a function.

Merging to `main` on the org repository deploys production. Every pull
request gets preview deployments of both projects.

The backend accepts cross-origin requests from `FRONTEND_URL`, any
`*.vercel.app` origin (so preview deployments work), and any
`http://localhost:*` origin. That policy lives in `backend/src/index.ts` and
nowhere else. Do not add an `Access-Control-Allow-Origin` header to
`backend/vercel.json`; a blanket `*` there would override it.

Database changes are not deployed by Vercel. A migration reaches production
only when someone runs `npx supabase db push`.
