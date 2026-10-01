# External Services

The site depends on four outside services: Supabase, Google OAuth, Cloudflare
Turnstile, and Vercel. This doc covers what each one does, where its keys
live, and how to work with it locally and in production.

None of these accounts are needed to run the public site locally. Local
Supabase runs in Docker with built-in keys, the captcha is skipped when its
keys are unset, and Vercel is only involved once you open a pull request.
Google credentials are needed only to sign in to the admin dashboard. See
[getting-started.md](getting-started.md).

## Supabase

Postgres database, file storage, and auth. The backend is the only client of
its data and storage; the frontend uses it solely for admin Google sign-in.

- **Local:** `npx supabase start` runs the whole stack in Docker. See
  [backend-stack.md](backend-stack.md#supabase-for-local-testing) for setup,
  daily workflow, and migrations.
- **Production:** the cloud project, linked to this repo via the CLI. Apply
  migrations with `npx supabase db push` after they pass a local `db reset`.
- **Keys:** the dashboard's API settings page has the project URL, the
  publishable (anon) key, and the secret (service-role) key. The anon key is
  safe in the browser; the secret key belongs only in `backend/.env` and the
  backend's Vercel env settings, never in frontend code or env files.

## Google OAuth (admin sign-in)

Admins sign in with Google through Supabase Auth. The browser calls
`supabase.auth.signInWithOAuth({ provider: "google" })` (see
`frontend/src/pages/AdminLogin.tsx`), Google redirects back through Supabase,
and Supabase persists the session.

**A Google sign-in alone grants nothing.** Any Google account can complete
OAuth. The backend's `ADMIN_EMAILS` allowlist is the actual gate: the
`authenticateAdmin` middleware verifies the token with Supabase, then checks
the email. Not on the list means 403. An empty allowlist fails closed.

### Locally

`supabase/config.toml` already enables the Google provider and points
`site_url` and the redirect allowlist at `http://localhost:5173`. The client
ID and secret are read from the environment when the stack starts. The
simplest way to supply them, on any operating system, is a file named
`supabase/.env` (git-ignored):

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<client id>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<client secret>
```

Setting the same two variables in your shell before `npx supabase start`
works too. Either way the stack only reads them at startup, so after a
change run `npx supabase stop` and then `npx supabase start`.

The OAuth client in Google Cloud Console must list the local Supabase
callback as an authorized redirect URI:
`http://127.0.0.1:54321/auth/v1/callback`. Ask a maintainer for the
development credentials, or create your own client as described in
[getting-started.md](getting-started.md#10-optional-sign-in-to-the-admin-dashboard).

Then put your own Google account in `ADMIN_EMAILS` in `backend/.env` and sign
in at `http://localhost:5173/admin`.

### In production

Three places must agree:

1. **Google Cloud Console** (APIs & Services > Credentials): a web OAuth
   client whose authorized redirect URI is the Supabase callback,
   `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase dashboard** (Authentication > Sign In / Providers): Google
   enabled with that client ID and secret. Under URL Configuration, the site
   URL is the production frontend and the redirect allowlist includes
   `https://<frontend-domain>/admin`.
3. **Backend Vercel project:** `ADMIN_EMAILS` lists the admin accounts.

If sign-in redirects to the wrong place or loops, the URL Configuration
allowlist is the usual culprit.

## Cloudflare Turnstile (registration captcha)

Protects the one public write endpoint, `POST /api/registrations`. The
widget in the browser produces a token; the backend confirms it with
Cloudflare's siteverify API (`backend/src/lib/turnstile.ts`). The widget
alone proves nothing, since a bot can post straight to the API; only the
server-side check counts, and tokens are single-use.

- **Keys:** created as a widget in the Cloudflare dashboard under Turnstile.
  The site key is public (`VITE_TURNSTILE_SITE_KEY`, frontend); the secret
  key is not (`TURNSTILE_SECRET_KEY`, backend only).
- **Locally**, two options:
  - Leave `TURNSTILE_SECRET_KEY` unset. The backend skips verification with
    a loud console warning, so registration works without Cloudflare
    credentials.
  - To exercise the full path, use Cloudflare's always-passing test pair:
    site key `1x00000000000000000000AA`, secret key
    `1x0000000000000000000000000000000AA`.
- **In production both real keys are required.** The form only renders the
  widget when the site key is set, and the backend only verifies when the
  secret is set, so a missing key silently disables the captcha rather than
  breaking the site. Check both after any env change.

## Vercel

Hosts two separate projects out of one repo: the frontend (static build +
SPA rewrites, plus the `/photos/*` rewrite that serves storage images
through Vercel's CDN) and the backend (Express as a serverless function). Deployment
details and required env vars are in
[frontend-stack.md](frontend-stack.md#deployment) and
[backend-stack.md](backend-stack.md#deployment).

- **Every PR gets preview deploys.** Vercel builds each push and comments
  the preview URLs on the PR.
- **Check the preview before production.** Click through the preview URL
  and confirm the surfaces you changed work there; local success does not
  guarantee the serverless build behaves the same (env vars, body-size
  limits, and rewrites only exist for real on Vercel). Merging to `main` is
  what deploys to production, so the preview is the last gate.
- **Env vars are per-environment.** A variable added for Production does
  not automatically exist for Preview; set both when adding one, or the
  preview will fail in ways production will not.
- **Body-size cap:** Vercel rejects request bodies over 4.5 MB, which is
  why image uploads are compressed client-side.
