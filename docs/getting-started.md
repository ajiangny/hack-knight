# Getting Started

This guide takes you from a computer with nothing installed to the full Hack
Knight site running on your machine with sample data. It assumes no prior
setup. If you already have Git, Node.js, and Docker, skip to
[step 3](#3-get-the-code).

You will be running three things:

| What | Where it runs | Address |
|---|---|---|
| Local Supabase (database, file storage, sign-in) | Docker | `http://127.0.0.1:54321` |
| Backend (Express API) | a terminal | `http://localhost:3000` |
| Frontend (the website) | a second terminal | `http://localhost:5173` |

Everything runs locally. You do not need access to the production database,
Vercel, or any shared passwords to work on the public site.

**About the commands in this guide.** They are written for a bash-style
terminal: Terminal on macOS, any terminal on Linux, and **Git Bash** on
Windows (installed with Git in step 2). They also work in PowerShell unless a
step says otherwise.

## 1. Check what you already have

Open a terminal and run each line. A version number means it is installed.
"command not found" (or "not recognized" on Windows) means it is not.

```bash
git --version
node --version
npm --version
docker --version
```

| Tool | Version you need | Used for |
|---|---|---|
| Git | any recent version | Downloading the code and saving your changes |
| Node.js | **24 (LTS) recommended**; 22.12 or newer works | Running the frontend and backend |
| npm | comes with Node.js | Installing the project's packages |
| Docker Desktop | any recent version | Running Supabase locally |

You do **not** need to install the Supabase CLI. The commands in this guide
run it through `npx`, which comes with Node.js and downloads it on first use.

## 2. Install what is missing

Install only the tools that step 1 reported missing. After installing
anything, **close and reopen your terminal** before checking again; a
terminal that was already open will not see the new program.

### Git

| System | How |
|---|---|
| macOS | Run `xcode-select --install` and accept the prompt. |
| Windows | Download [Git for Windows](https://git-scm.com/download/win) and keep the default options, or run `winget install Git.Git`. This also installs Git Bash. |
| Linux | Debian/Ubuntu: `sudo apt install git`. Fedora: `sudo dnf install git`. |

Then tell Git who you are (use the email on your GitHub account):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

You also need a free [GitHub account](https://github.com/signup).

### Node.js

Pick one option.

**Option A, the installer (simplest).** Download the **LTS** version from
[nodejs.org](https://nodejs.org) and run it with the default options. On
Windows you can run `winget install OpenJS.NodeJS.LTS` instead.

**Option B, a version manager.** Useful if you work on other projects that
need a different Node version. Follow the install instructions for
[nvm](https://github.com/nvm-sh/nvm#installing-and-updating) (macOS and
Linux) or [nvm-windows](https://github.com/coreybutler/nvm-windows#installation--upgrades)
(Windows), then:

```bash
nvm install 24
nvm use 24
```

### Docker Desktop

Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
for your system and install it.

- **Windows:** Docker Desktop needs WSL 2. If the installer asks, let it
  enable WSL 2. If it reports that WSL is missing, open PowerShell **as
  Administrator**, run `wsl --install`, restart your computer, then start
  Docker Desktop again.
- **macOS:** pick the download that matches your chip (Apple Silicon or
  Intel). The Apple menu > About This Mac shows which one you have.
- **Linux:** Docker Desktop or
  [Docker Engine](https://docs.docker.com/engine/install/) both work. With
  Docker Engine, add yourself to the `docker` group so you do not need
  `sudo`: `sudo usermod -aG docker $USER`, then log out and back in.

**Start Docker Desktop and leave it running.** Docker being installed is not
enough; the app has to be open. Confirm it is ready:

```bash
docker info
```

If this prints a long status report, you are set. If it says it cannot
connect to the Docker daemon, Docker Desktop is not running yet.

### A code editor

Any editor works. The repository includes settings for
[VS Code](https://code.visualstudio.com), which is a good default.

## 3. Get the code

Development happens on personal forks. The organization's repository is
where finished work gets merged.

1. Open [codeforallqc/hack-knight](https://github.com/codeforallqc/hack-knight)
   on GitHub and click **Fork** to create your own copy.
2. Clone your fork, replacing `<your-username>`:

   ```bash
   git clone https://github.com/<your-username>/hack-knight.git
   cd hack-knight
   ```

3. Connect your copy to the organization's repository so you can pull in
   other people's changes later:

   ```bash
   git remote add upstream https://github.com/codeforallqc/hack-knight.git
   git remote -v
   ```

   The last command should list both `origin` (your fork) and `upstream`
   (the organization).

Every command from here on assumes you start in the `hack-knight` folder.

## 4. Install the project's packages

The frontend and backend are separate projects, so install each one:

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

Each install can take a minute or two. Warnings are normal. Lines starting
with `npm error` are not; see [Troubleshooting](#troubleshooting).

## 5. Start local Supabase

From the `hack-knight` folder, with Docker Desktop running:

```bash
npx supabase start
```

- If npm asks whether to install the `supabase` package, answer `y`.
- **The first run downloads several gigabytes of Docker images**, so it is
  slow on the first run only. Use a good connection and let it finish.
- You may see a warning that `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` is
  unset. That only affects admin sign-in, which is optional
  ([step 10](#10-optional-sign-in-to-the-admin-dashboard)).

When it finishes it prints a list of addresses and keys. You need two of the
keys in the next step. To print them again at any time:

```bash
npx supabase status
```

| In the output | You will use it as |
|---|---|
| **Secret key** (older CLI versions call it `service_role key`) | `SUPABASE_SECRET_KEY` |
| **Publishable key** (older CLI versions call it `anon key`) | `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY` |

These local keys are the same defaults on every developer's machine and
unlock nothing outside your computer. The production keys are a different
matter and are never needed for local work.

## 6. Create your environment files

Environment files hold settings that differ between machines. Git ignores
them, so they are never uploaded. Create both from the provided templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

(In the Windows Command Prompt, use `copy` instead of `cp`.)

Open **`backend/.env`** in your editor and fill it in:

```bash
PORT=3000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=<paste the Secret key>
SUPABASE_ANON_KEY=<paste the Publishable key>
ADMIN_EMAILS=<your Google account email>
TURNSTILE_SECRET_KEY=
```

Open **`frontend/.env.local`** and fill it in:

```bash
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<paste the Publishable key>
VITE_TURNSTILE_SITE_KEY=
```

Points that trip people up:

- **No spaces around `=`** and no quotes around values.
- **`ADMIN_EMAILS` cannot be empty.** The backend refuses to start without
  it. Put your own Google email there even if you never open the admin.
- **`VITE_API_URL` ends in `/api`.**
- **`VITE_SUPABASE_URL` must be `127.0.0.1`, not `localhost`.** The sample
  image addresses use that exact host, and the site matches on it.
- **Leave both Turnstile lines empty.** The captcha is skipped locally, and
  the backend prints a warning saying so. That warning is expected.
- The file is `frontend/.env.local`, not `frontend/.env`.

## 7. Load the sample data

A new database has tables but no content. The repository includes fake
sample data (team members, a schedule, sponsors, test applications) and
matching images.

> **`db reset` erases your local database** and rebuilds it. On a first
> setup there is nothing to lose. Later on, remember that it removes
> anything you added locally.

```bash
cp supabase/seeds/dummy.sql supabase/seed.sql
npx supabase db reset
```

`db reset` replays every file in `supabase/migrations/` and then loads
`supabase/seed.sql`. That file is ignored by Git, so your copy stays on your
machine.

Then upload the sample images. Run this again after every `db reset`,
because a reset also clears stored files:

```bash
cd backend
npx tsx scripts/seed-storage.ts
cd ..
```

It should end with `Done: 15 files uploaded to "photos"`. The script refuses
to run against anything other than a local Supabase.

## 8. Start the backend

```bash
cd backend
npm run dev
```

You should see `Server running on port 3000`. **Leave this terminal open**;
the backend stops when you close it or press `Ctrl+C`.

Check it by opening <http://localhost:3000/api/health> in a browser. It
should show `{"status":"ok"}`.

## 9. Start the frontend

Open a **second terminal**, go to the `hack-knight` folder, and run:

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173>. You should see the Hack Knight home page.

### Confirm it is really working

The public site shows built-in placeholder content whenever it cannot reach
the backend, so a page that looks fine is not proof that your setup works.
Check these:

- [ ] The Team section shows **Team Member 1**, **Team Member 2**, and so on.
      Those names come from the sample data in your database.
- [ ] The photo gallery and team photos load, with no broken-image icons.
- [ ] <http://localhost:3000/api/team> shows a list of team members.
- [ ] In the browser's developer tools (press `F12`), the **Console** tab has
      no red errors and the **Network** tab shows requests to
      `localhost:3000` succeeding.
- [ ] <http://127.0.0.1:54323> opens Supabase Studio, where you can browse
      the tables.

If all of those pass, you are ready to work on the public site.

## 10. Optional: sign in to the admin dashboard

You only need this to work on `/admin`. Admin sign-in uses Google, so your
local Supabase needs Google OAuth credentials (a client ID and a client
secret).

**Get credentials.** Either ask a maintainer for the development
credentials, or create your own:

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   a project, then go to **APIs & Services > Credentials**.
2. Create an **OAuth client ID** of type **Web application**. If prompted,
   configure the consent screen first and add your own account as a test
   user.
3. Under **Authorized redirect URIs**, add exactly:
   `http://127.0.0.1:54321/auth/v1/callback`
4. Copy the client ID and client secret.

**Give them to Supabase.** Create a file named `supabase/.env` (ignored by
Git) containing:

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<client id>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<client secret>
```

**Restart Supabase** so it reads the file:

```bash
npx supabase stop
npx supabase start
```

**Sign in.** Make sure the Google account you will use is listed in
`ADMIN_EMAILS` in `backend/.env` (separate several with commas), restart the
backend if you changed it, then open <http://localhost:5173/admin>.

If you see "not authorized" after signing in, the account is not in
`ADMIN_EMAILS`. Signing in with Google is not enough on its own; the list is
what grants access.

## Day to day

Once set up, a normal session looks like this:

```bash
# 1. Make sure Docker Desktop is open, then, from the hack-knight folder:
npx supabase start                    # quick if it is already running
npx supabase migration list --local   # every row should have a value in both columns

# 2. Terminal one
cd backend && npm run dev

# 3. Terminal two
cd frontend && npm run dev
```

When you are done, press `Ctrl+C` in both terminals. To shut Supabase down
and free up memory, run `npx supabase stop`. Your data is kept.

After pulling other people's changes:

```bash
git fetch upstream
git checkout main
git merge --ff-only upstream/main

cd backend && npm install && cd ..    # only needed if package.json changed
cd frontend && npm install && cd ..
npx supabase migration up --local     # apply any new database changes
```

Before you start a change, read
[testing-and-github.md](testing-and-github.md) for the branch, commit, and
pull request rules. The short version: never commit to `main`, create a
branch named like `feat/short-description`, and run these before pushing:

```bash
cd frontend && npm run lint && npm run build
cd ../backend && npm run build
```

## Troubleshooting

### Installing and starting

| What you see | Cause | Fix |
|---|---|---|
| `command not found: node` (or `npm`, `git`, `docker`) | Not installed, or the terminal was open during the install | Install it (step 2), then close and reopen the terminal |
| PowerShell: `npm.ps1 cannot be loaded because running scripts is disabled` | PowerShell's default policy blocks scripts | Use Git Bash, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell once |
| `Cannot connect to the Docker daemon` | Docker Desktop is not running | Open Docker Desktop, wait until it reports it is running, and retry |
| `npx supabase start` fails with `port is already allocated` | Another program, or another Supabase project, is using the port | Run `npx supabase stop`, stop the other program, and retry. `docker ps` lists running containers |
| `npx supabase start` hangs or fails partway through the first run | An interrupted image download | Run `npx supabase stop`, then `npx supabase start` again |
| `npm error` lines mentioning `EACCES` or permissions | npm cannot write to its folders | Do not use `sudo npm`. Installing Node through nvm (step 2, option B) avoids this |
| `npm install` fails with engine or syntax errors | Node.js is too old | `node --version` must be 22.12 or newer |

### Backend

| What you see | Cause | Fix |
|---|---|---|
| `Missing required environment variable: <NAME>` and the server exits | That line is missing or empty in `backend/.env` | Fill it in (step 6). Check the file is `backend/.env`, not `.env.example` |
| `Error: listen EADDRINUSE: address already in use :::3000` | The backend is already running in another terminal | Close the other one, or change `PORT` in `backend/.env` and update `VITE_API_URL` to match |
| `TURNSTILE_SECRET_KEY is unset — SKIPPING captcha verification` | Expected locally | Nothing to fix |
| A route returns a 500 with a generic message | Usually the local database is missing a migration | `npx supabase migration list --local`, then `npx supabase migration up --local` |
| Requests fail after a computer restart | Supabase is not running | `npx supabase start` |

### Frontend

| What you see | Cause | Fix |
|---|---|---|
| Blank white page; console says `Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY` | `frontend/.env.local` is missing or incomplete | Fill it in (step 6), then restart `npm run dev` |
| You edited an env file and nothing changed | Env files are read once, at startup | Stop the dev server with `Ctrl+C` and start it again |
| Every team member has the same name and every sponsor is called "Company", instead of "Team Member 1" and "Platinum Sponsor" from the sample data | The frontend cannot reach the backend and is showing placeholder content | Check the backend is running, and that `VITE_API_URL` is `http://localhost:3000/api` |
| Broken images | The sample images were not uploaded, or `VITE_SUPABASE_URL` uses `localhost` | Run the seed script (step 7). Set `VITE_SUPABASE_URL=http://127.0.0.1:54321` and restart |
| Console shows a CORS error | The backend is not running, or the frontend is on an unexpected address | Start the backend. Open the site at `http://localhost:5173`, not `127.0.0.1:5173` |
| The Apply page says applications are closed | The `registration_open` setting is off | The sample data turns it on. Reload the sample data, or toggle it in Admin > Misc |

### Admin sign-in

| What you see | Cause | Fix |
|---|---|---|
| Google shows `redirect_uri_mismatch` | The redirect URI in Google Cloud does not match | It must be exactly `http://127.0.0.1:54321/auth/v1/callback` |
| Sign-in fails immediately with a provider error | Supabase started without the Google credentials | Create `supabase/.env` (step 10), then `npx supabase stop` and `npx supabase start` |
| "not authorized" after signing in | Your email is not in `ADMIN_EMAILS` | Add it to `backend/.env` and restart the backend |
| You were signed out after `db reset` | A reset also deletes local sign-in records | Sign in again |

### Still stuck

Ask a maintainer and include: your operating system, the exact command you
ran, and the full error text. Before you paste anything, remove keys and
passwords from it.

## Where to go next

| Doc | Read it when |
|---|---|
| [architecture.md](architecture.md) | You want to understand how the pieces connect |
| [frontend-stack.md](frontend-stack.md) | You are working on the website or admin UI |
| [backend-stack.md](backend-stack.md) | You are working on the API or database |
| [testing-and-github.md](testing-and-github.md) | Before your first commit |
| [external-services.md](external-services.md) | You need to know how Supabase, Google, Turnstile, or Vercel are configured |
| [MASTER.md](MASTER.md) | You are changing how something looks |
