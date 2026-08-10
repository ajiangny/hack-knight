# Testing Habits & GitHub Practices

How we verify changes and how code gets from your machine into
`codeforallqc/hack-knight:main`.

## Testing

There is **no automated test framework** in this repo. Verification is
manual, so the discipline matters more: **never claim something works
without having run it and seen the output.**

### The minimum bar for any change

Before you push, all of these must pass:

```bash
# Frontend changes
cd frontend
npm run lint          # no ESLint errors
npm run build         # production build succeeds

# Backend changes
cd backend
npm run build         # TypeScript compiles with no errors (strict mode)
npm run dev           # server boots without env/startup errors
```

Treat a failing `npm run build` as a failing test. Strict-mode TypeScript is
the closest thing we have to a test suite.

### Testing backend changes

1. Start local Supabase and the backend (see
   [backend-stack.md](backend-stack.md#supabase-for-local-testing)).
2. Hit the health check: `curl http://localhost:3000/api/health`.
3. Exercise **every endpoint you touched**, including the failure cases:

   ```bash
   # Public read
   curl http://localhost:3000/api/schedule

   # Getting a token: admin auth is Google sign-in via Supabase, so there is
   # no login endpoint to curl. Sign in at http://localhost:5173/admin, open
   # the browser dev tools Network tab, and copy the Authorization header
   # from any /api request the dashboard makes.

   # Authenticated write
   curl -X POST http://localhost:3000/api/schedule \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"day":"fri","start_hour":18,"end_hour":19,"label":"Test event"}'

   # Failure cases: no token expects 401; a Google account not in
   # ADMIN_EMAILS expects 403; a bad body expects 400/422
   ```

4. For schema changes, run `npx supabase db reset` and confirm all
   migrations apply cleanly to an empty database.
5. Check the data landed correctly in Studio (`http://127.0.0.1:54323`).

### Testing frontend changes

1. Run the backend and local Supabase, then `npm run dev` in `frontend/`
   with `VITE_API_URL` set.
2. Click through the surfaces you changed, watching the browser console and
   network tab for errors.
3. Test the **fallback path**: stop the backend and confirm public pages
   still render from the static data in `src/data/`.
4. For admin changes: log in, do the full create, edit, delete cycle, and
   confirm a 401 (expired or cleared token) bounces you to the login page.
5. For image uploads: use a large image and confirm client-side compression
   keeps the request under Vercel's 4.5 MB body limit.

### Pulling production data into your local database

Migrations give you the schema. When you want real production data too, the
CLI can snapshot it into the local seed file (the repo is linked to the
production Supabase project):

```bash
# From the repo root, with the local stack running (npx supabase start)

# 1. (Optional) check for schema drift. "No schema changes found" means
#    production already matches your local migrations
npx supabase db pull

# 2. Dump production data into the seed file (prompts for the database
#    password, found under Project Settings > Database in the dashboard)
npx supabase db dump --data-only -s public -f supabase/seed.sql

# 3. Rebuild local from migrations, then load the dumped data
npx supabase db reset
```

`config.toml` points `[db.seed]` at `supabase/seed.sql`, so every later
`db reset` re-loads that snapshot. Re-run step 2 for fresher data. If
`db pull` finds drift, it writes a new migration file; review and commit it
like any other migration.

Rules that keep this working:

- **Keep the `-s public` flag.** Without it the dump includes `storage`
  schema rows, which collide with the buckets the migrations create and
  reference files that do not exist locally.
- **Do not add `--use-copy`.** It emits `COPY` blocks only `psql`
  understands; `db reset` runs the seed as plain SQL and fails. The default
  `INSERT` output works.
- **Photos still render.** Image `src` columns hold full production URLs
  and the `photos` bucket is public-read, so images load from the cloud
  even against a local database.
- **Never commit `supabase/seed.sql`.** It is a production data dump and is
  git-ignored. Keep it that way.

### Habits worth keeping

- **Test at the boundary you changed.** A route change gets curl; a hook
  change gets a browser check; a schema change gets `db reset`.
- **Reset state before verifying** so you are not testing against leftovers
  from a previous session.
- **Verify error paths, not just success.** Missing auth, bad input, and
  empty responses are where regressions hide.
- **Final check is the Vercel preview deploy.** Every PR gets a preview
  URL; click through it before merging. Local success does not guarantee
  the serverless build behaves identically (see
  [external-services.md](external-services.md#vercel)).
- **If you add a test framework later**, the natural fits are Vitest for
  the frontend and Vitest + Supertest for the Express routes. Add it in its
  own PR.

## GitHub practices

### Repo model: fork + upstream

Development happens on personal forks; the org repo is the source of truth.

- `upstream` is `codeforallqc/hack-knight` (org repo, where PRs merge)
- `origin` is your personal fork (e.g. `ajiangny/hack-knight`)

**Nothing is committed to `main` directly**, on the org repo or on your
fork. `main` only moves by syncing from upstream.

### Branch workflow

```bash
# 1. Sync your main with the org repo
git fetch upstream
git checkout main
git merge --ff-only upstream/main
git push origin main

# 2. Branch off fresh main
git checkout -b feat/<short-name>

# 3. Work in small, logical commits (see message format below)

# 4. Push to your fork and open a PR
git push -u origin feat/<short-name>
# PR: yourfork:feat/<short-name> into codeforallqc:main

# 5. After merge: sync main again, delete the branch, start the next one
git branch -d feat/<short-name>
git push origin --delete feat/<short-name>
```

### Branch naming

`<type>/<short-kebab-name>`, matching the commit types below:

- `feat/gallery-api`, `feat/resume-upload`
- `fix/schedule-timezone`
- `chore/dependency-bumps`

### Commit messages: Conventional Commits

Format: `type(scope): imperative description`. Scope is optional but
preferred. Real examples from this repo's history:

```
feat(admin): add login page
feat(api): require a resume on registration and serve it to admins via signed URLs
fix(site): follow horizontal scrollbar drags with the custom cursor
refactor(frontend): fetch schedule/gallery/team from API
chore(backend): replace better-sqlite3 with @supabase/supabase-js
```

Types in use: `feat`, `fix`, `refactor`, `chore`, `docs`. Common scopes:
`frontend`, `backend`, `admin`, `site`, `api`, `db`, `hooks`.

Keep commits **small and logical**: one coherent change per commit, so a
reviewer can read the history as a story and a bad change can be reverted
cleanly. A dependency swap, its code changes, and an unrelated UI tweak are
three commits, not one.

### Pull requests

- **One concern per PR.** If a PR breaks the site when merged by itself, it
  is scoped wrong. Big features ship as a series of small PRs, each
  independently reviewable and safe to merge alone.
- In the description say **what** changed, **why**, and **how you verified
  it** (the commands you ran, what you clicked through).
- Check the Vercel preview deploy before asking for review.
- Address review feedback with new commits. Do not rewrite pushed history
  mid-review.

### Hard rules

- No direct commits to `main`.
- No force-pushing shared branches (anything someone else may have pulled).
- Never commit secrets. `backend/.env` and `frontend/.env.local` are
  git-ignored; keep them that way. If a secret ever lands in a commit,
  rotate it. Deleting the commit is not enough.
- Never commit `supabase/seed.sql` (production data dump).
- Commit `package-lock.json` together with `package.json`, and never
  hand-edit the lockfile.
